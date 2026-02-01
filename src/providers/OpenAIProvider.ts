/**
 * JARVIS OpenAI Provider
 * 
 * Fallback LLM provider using GPT-4o.
 * Implements function calling and streaming support.
 */

import OpenAI from 'openai';
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

type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type OpenAITool = OpenAI.Chat.Completions.ChatCompletionTool;

// ═══════════════════════════════════════════════════════════════════════════════
// Context Window Sizes by Model
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    'o1': 200000,
    'o1-mini': 128000,
    'o1-preview': 128000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI Provider Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class OpenAIProvider extends BaseLLMProvider {
    readonly name = 'openai';
    readonly model: string;

    private client: OpenAI;

    constructor() {
        super();
        const config = getConfig();
        this.model = config.providers.openai.model;

        this.client = new OpenAI({
            apiKey: config.providers.openai.apiKey || '',
        });
    }

    async isAvailable(): Promise<boolean> {
        const config = getConfig();

        if (!config.providers.openai.apiKey) {
            logger.provider(this.name, 'No API key configured');
            return false;
        }

        try {
            // Quick health check with minimal token usage
            await this.client.chat.completions.create({
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

                const openAIMessages = this.convertMessages(messages, systemPrompt);
                const openAITools = tools ? this.convertTools(tools) : undefined;

                const response = await this.client.chat.completions.create({
                    model: this.model,
                    max_tokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                    temperature: options?.temperature ?? config.agent.temperature,
                    messages: openAIMessages,
                    tools: openAITools,
                    tool_choice: openAITools ? 'auto' : undefined,
                    stop: options?.stopSequences,
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

            const openAIMessages = this.convertMessages(messages, systemPrompt);
            const openAITools = tools ? this.convertTools(tools) : undefined;

            const stream = await this.client.chat.completions.create({
                model: this.model,
                max_tokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                temperature: options?.temperature ?? config.agent.temperature,
                messages: openAIMessages,
                tools: openAITools,
                tool_choice: openAITools ? 'auto' : undefined,
                stop: options?.stopSequences,
                stream: true,
            });

            const toolCalls: Map<number, Partial<ToolCall>> = new Map();

            for await (const chunk of stream) {
                const choice = chunk.choices[0];
                if (!choice) continue;

                const delta = choice.delta;

                // Text content
                if (delta.content) {
                    yield { type: 'text', content: delta.content };
                }

                // Tool calls
                if (delta.tool_calls) {
                    for (const toolCallDelta of delta.tool_calls) {
                        const index = toolCallDelta.index;

                        if (!toolCalls.has(index)) {
                            // Start of new tool call
                            const newToolCall: Partial<ToolCall> = {
                                id: toolCallDelta.id,
                                name: toolCallDelta.function?.name,
                                arguments: {},
                            };
                            toolCalls.set(index, newToolCall);
                            yield { type: 'tool_call_start', toolCall: newToolCall };
                        }

                        const currentToolCall = toolCalls.get(index)!;

                        // Accumulate function arguments
                        if (toolCallDelta.function?.arguments) {
                            const current = currentToolCall.arguments as Record<string, unknown>;
                            const argStr = (current._raw as string || '') + toolCallDelta.function.arguments;
                            currentToolCall.arguments = { _raw: argStr };

                            yield {
                                type: 'tool_call_delta',
                                toolCall: currentToolCall,
                                content: toolCallDelta.function.arguments,
                            };
                        }
                    }
                }

                // Finish reason
                if (choice.finish_reason) {
                    // Finalize tool calls
                    for (const [, toolCall] of toolCalls) {
                        const rawArgs = (toolCall.arguments as Record<string, unknown>)?._raw;
                        if (typeof rawArgs === 'string') {
                            try {
                                toolCall.arguments = JSON.parse(rawArgs);
                            } catch {
                                toolCall.arguments = { raw: rawArgs };
                            }
                        }
                        yield { type: 'tool_call_end', toolCall: toolCall as ToolCall };
                    }

                    yield {
                        type: 'done',
                        finishReason: this.mapFinishReason(choice.finish_reason),
                    };
                }
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    getContextWindowSize(): number {
        return MODEL_CONTEXT_WINDOWS[this.model] ?? 128000;
    }

    countTokens(text: string): number {
        // GPT-4 uses cl100k_base tokenizer, ~4 chars per token
        return Math.ceil(text.length / 4);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Protected Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    protected convertMessages(messages: Message[], systemPrompt: string): OpenAIMessage[] {
        const result: OpenAIMessage[] = [];

        // Add system prompt first
        if (systemPrompt) {
            result.push({ role: 'system', content: systemPrompt });
        }

        // Convert messages
        for (const msg of messages) {
            if (msg.role === 'system') continue; // Already handled
            result.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            });
        }

        return result;
    }

    protected convertTools(tools: ToolDefinition[]): OpenAITool[] {
        return tools.map(tool => ({
            type: 'function' as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: 'object',
                    properties: this.convertToolParameters(tool.parameters.properties),
                    required: tool.parameters.required,
                },
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

    private transformResponse(
        response: OpenAI.Chat.Completions.ChatCompletion
    ): AgentResponse {
        const choice = response.choices[0];
        if (!choice) {
            throw new ProviderError(this.name, 'No choices in response');
        }

        const message = choice.message;
        const toolCalls: ToolCall[] = [];

        if (message.tool_calls) {
            for (const tc of message.tool_calls) {
                let args: Record<string, unknown> = {};
                try {
                    args = JSON.parse(tc.function.arguments);
                } catch {
                    args = { raw: tc.function.arguments };
                }

                toolCalls.push({
                    id: tc.id,
                    name: tc.function.name,
                    arguments: args,
                });
            }
        }

        return {
            content: message.content ?? '',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            finishReason: this.mapFinishReason(choice.finish_reason),
            usage: {
                inputTokens: response.usage?.prompt_tokens ?? 0,
                outputTokens: response.usage?.completion_tokens ?? 0,
                totalTokens: response.usage?.total_tokens ?? 0,
            },
            model: response.model,
            provider: this.name,
        };
    }

    private mapFinishReason(
        finishReason: string | null
    ): AgentResponse['finishReason'] {
        switch (finishReason) {
            case 'stop':
                return 'stop';
            case 'tool_calls':
                return 'tool_use';
            case 'length':
                return 'max_tokens';
            default:
                return 'stop';
        }
    }

    private handleError(error: unknown): Error {
        if (error instanceof OpenAI.APIError) {
            const status = error.status;
            const message = error.message;

            if (status === 401) {
                return new ProviderAuthError(this.name);
            }
            if (status === 429) {
                return new ProviderRateLimitError(this.name);
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
