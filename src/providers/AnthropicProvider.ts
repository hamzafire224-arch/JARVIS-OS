/**
 * JARVIS Anthropic Provider
 * 
 * Primary LLM provider using Claude 3.5 Sonnet.
 * Implements native tool use and streaming support.
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider, type LLMProviderOptions } from './LLMProvider.js';
import type {
    Message,
    ToolDefinition,
    AgentResponse,
    StreamChunk,
    ToolCall
} from '../agent/types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
    ProviderAuthError,
    ProviderError,
    ProviderRateLimitError,
    ProviderUnavailableError
} from '../utils/errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Type Mappings
// ═══════════════════════════════════════════════════════════════════════════════

type AnthropicMessage = Anthropic.MessageParam;
type AnthropicTool = Anthropic.Tool;
type AnthropicContentBlock = Anthropic.ContentBlock;
type AnthropicToolUseBlock = Anthropic.ToolUseBlock;

// ═══════════════════════════════════════════════════════════════════════════════
// Context Window Sizes by Model
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'claude-3-5-sonnet-20241022': 200000,
    'claude-3-5-sonnet-20240620': 200000,
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-3-5-haiku-20241022': 200000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Anthropic Provider Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class AnthropicProvider extends BaseLLMProvider {
    readonly name = 'anthropic';
    readonly model: string;

    private client: Anthropic;

    constructor() {
        super();
        const config = getConfig();
        this.model = config.providers.anthropic.model;

        this.client = new Anthropic({
            apiKey: config.providers.anthropic.apiKey || '',
        });
    }

    async isAvailable(): Promise<boolean> {
        const config = getConfig();

        if (!config.providers.anthropic.apiKey) {
            logger.provider(this.name, 'No API key configured');
            return false;
        }

        try {
            // Quick health check with minimal token usage
            await this.client.messages.create({
                model: this.model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'hi' }],
            });
            logger.provider(this.name, 'Available and authenticated');
            return true;
        } catch (error) {
            logger.provider(this.name, 'Availability check failed', { error: String(error) });
            return false;
        }
    }

    async generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): Promise<AgentResponse> {
        const config = getConfig();

        return this.withRetry(async () => {
            try {
                logger.provider(this.name, 'Generating response', {
                    messageCount: messages.length,
                    toolCount: tools?.length ?? 0,
                });

                const anthropicMessages = this.convertMessages(messages);
                const anthropicTools = tools ? this.convertTools(tools) : undefined;

                const response = await this.client.messages.create({
                    model: this.model,
                    max_tokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                    temperature: options?.temperature ?? config.agent.temperature,
                    system: systemPrompt,
                    messages: anthropicMessages,
                    tools: anthropicTools,
                    stop_sequences: options?.stopSequences,
                });

                return this.transformResponse(response);
            } catch (error) {
                throw this.handleError(error);
            }
        });
    }

    async *streamResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): AsyncGenerator<StreamChunk> {
        const config = getConfig();

        try {
            logger.provider(this.name, 'Starting stream', {
                messageCount: messages.length,
                toolCount: tools?.length ?? 0,
            });

            const anthropicMessages = this.convertMessages(messages);
            const anthropicTools = tools ? this.convertTools(tools) : undefined;

            const stream = await this.client.messages.stream({
                model: this.model,
                max_tokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                temperature: options?.temperature ?? config.agent.temperature,
                system: systemPrompt,
                messages: anthropicMessages,
                tools: anthropicTools,
                stop_sequences: options?.stopSequences,
            });

            let currentToolCall: Partial<ToolCall> | null = null;
            let toolCallJsonBuffer = '';

            for await (const event of stream) {
                if (event.type === 'content_block_start') {
                    const block = event.content_block;
                    if (block.type === 'tool_use') {
                        currentToolCall = {
                            id: block.id,
                            name: block.name,
                            arguments: {},
                        };
                        toolCallJsonBuffer = '';
                        yield { type: 'tool_call_start', toolCall: currentToolCall };
                    }
                } else if (event.type === 'content_block_delta') {
                    const delta = event.delta;
                    if (delta.type === 'text_delta') {
                        yield { type: 'text', content: delta.text };
                    } else if (delta.type === 'input_json_delta' && currentToolCall) {
                        toolCallJsonBuffer += delta.partial_json;
                        yield {
                            type: 'tool_call_delta',
                            toolCall: { ...currentToolCall },
                            content: delta.partial_json,
                        };
                    }
                } else if (event.type === 'content_block_stop') {
                    if (currentToolCall && toolCallJsonBuffer) {
                        try {
                            currentToolCall.arguments = JSON.parse(toolCallJsonBuffer);
                        } catch {
                            currentToolCall.arguments = { raw: toolCallJsonBuffer };
                        }
                        yield { type: 'tool_call_end', toolCall: currentToolCall as ToolCall };
                        currentToolCall = null;
                        toolCallJsonBuffer = '';
                    }
                } else if (event.type === 'message_stop') {
                    const finalMessage = await stream.finalMessage();
                    yield {
                        type: 'done',
                        finishReason: this.mapStopReason(finalMessage.stop_reason),
                    };
                }
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    getContextWindowSize(): number {
        return MODEL_CONTEXT_WINDOWS[this.model] ?? 200000;
    }

    /**
     * More accurate token counting for Claude models.
     * Uses cl100k_base approximation (~3.5 chars/token for mixed content)
     */
    countTokens(text: string): number {
        // Claude uses a similar tokenizer to GPT-4
        // Average is ~3.5 characters per token for mixed content
        return Math.ceil(text.length / 3.5);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Protected Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    protected convertMessages(messages: Message[]): AnthropicMessage[] {
        return messages
            .filter(m => m.role !== 'system') // System prompt handled separately
            .map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            }));
    }

    protected convertTools(tools: ToolDefinition[]): AnthropicTool[] {
        return tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object' as const,
                properties: this.convertToolParameters(tool.parameters.properties),
                required: tool.parameters.required,
            },
        }));
    }

    private convertToolParameters(
        properties: ToolDefinition['parameters']['properties']
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, param] of Object.entries(properties)) {
            result[key] = {
                type: param.type,
                description: param.description,
                ...(param.enum && { enum: param.enum }),
                ...(param.items && { items: this.convertToolParameters({ item: param.items }).item }),
                ...(param.properties && { properties: this.convertToolParameters(param.properties) }),
            };
        }

        return result;
    }

    private transformResponse(response: Anthropic.Message): AgentResponse {
        const textContent: string[] = [];
        const toolCalls: ToolCall[] = [];

        for (const block of response.content) {
            if (block.type === 'text') {
                textContent.push(block.text);
            } else if (block.type === 'tool_use') {
                toolCalls.push({
                    id: block.id,
                    name: block.name,
                    arguments: block.input as Record<string, unknown>,
                });
            }
        }

        return {
            content: textContent.join(''),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            finishReason: this.mapStopReason(response.stop_reason),
            usage: {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
                totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            model: response.model,
            provider: this.name,
        };
    }

    private mapStopReason(
        stopReason: Anthropic.Message['stop_reason']
    ): AgentResponse['finishReason'] {
        switch (stopReason) {
            case 'end_turn':
                return 'stop';
            case 'tool_use':
                return 'tool_use';
            case 'max_tokens':
                return 'max_tokens';
            default:
                return 'stop';
        }
    }

    private handleError(error: unknown): Error {
        if (error instanceof Anthropic.APIError) {
            const status = error.status;
            const message = error.message;

            if (status === 401) {
                return new ProviderAuthError(this.name);
            }
            if (status === 429) {
                const retryAfter = parseInt(error.headers?.['retry-after'] ?? '60', 10);
                return new ProviderRateLimitError(this.name, retryAfter);
            }
            if (status === 503 || status === 500) {
                return new ProviderUnavailableError(this.name, message);
            }

            return new ProviderError(this.name, message, status);
        }

        return new ProviderError(
            this.name,
            error instanceof Error ? error.message : String(error)
        );
    }
}
