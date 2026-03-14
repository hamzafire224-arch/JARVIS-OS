/**
 * JARVIS Google Gemini Provider
 * 
 * Optional LLM provider using Google's Gemini models.
 * Implements function calling and streaming support.
 */

import {
    GoogleGenerativeAI,
    type GenerativeModel,
    type Part,
    type Content,
    type Tool,
    type FunctionDeclaration,
    SchemaType,
} from '@google/generative-ai';
import { BaseLLMProvider, type LLMProviderOptions } from './LLMProvider.js';
import type {
    Message,
    ToolDefinition,
    AgentResponse,
    StreamChunk,
    ToolCall,
} from '../agent/types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import {
    ProviderAuthError,
    ProviderError,
    ProviderRateLimitError,
    ProviderUnavailableError,
} from '../utils/errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Context Window Sizes by Model
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'gemini-1.5-pro': 2097152, // 2M tokens!
    'gemini-1.5-flash': 1048576, // 1M tokens
    'gemini-1.5-flash-8b': 1048576,
    'gemini-1.0-pro': 32768,
    'gemini-2.0-flash': 1048576,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Gemini Provider Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class GeminiProvider extends BaseLLMProvider {
    readonly name = 'gemini';
    readonly model: string;

    private client: GoogleGenerativeAI;
    private generativeModel: GenerativeModel;

    constructor() {
        super();
        const config = getConfig();
        this.model = config.providers.gemini.model;

        this.client = new GoogleGenerativeAI(config.providers.gemini.apiKey || '');
        this.generativeModel = this.client.getGenerativeModel({ model: this.model });
    }

    async isAvailable(): Promise<boolean> {
        const config = getConfig();

        if (!config.providers.gemini.apiKey) {
            logger.provider(this.name, 'No API key configured');
            return false;
        }

        try {
            // Quick health check
            const result = await this.generativeModel.generateContent('hi');
            const response = result.response;
            logger.provider(this.name, 'Available and authenticated');
            return !!response.text();
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

                const geminiTools = tools ? this.convertTools(tools) : undefined;

                const model = this.client.getGenerativeModel({
                    model: this.model,
                    systemInstruction: systemPrompt,
                    generationConfig: {
                        maxOutputTokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                        temperature: options?.temperature ?? config.agent.temperature,
                        stopSequences: options?.stopSequences,
                    },
                    tools: geminiTools as Tool[] | undefined,
                });

                const chat = model.startChat({
                    history: this.convertMessages(messages) as Content[],
                });

                // Get the last user message
                const lastMessage = messages.filter((m) => m.role === 'user').pop();
                if (!lastMessage) {
                    throw new ProviderError(this.name, 'No user message found');
                }

                const result = await chat.sendMessage(lastMessage.content);
                const response = result.response;

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

            const geminiTools = tools ? this.convertTools(tools) : undefined;

            const model = this.client.getGenerativeModel({
                model: this.model,
                systemInstruction: systemPrompt,
                generationConfig: {
                    maxOutputTokens: options?.maxTokens ?? config.agent.maxResponseTokens,
                    temperature: options?.temperature ?? config.agent.temperature,
                    stopSequences: options?.stopSequences,
                },
                tools: geminiTools as Tool[] | undefined,
            });

            const chat = model.startChat({
                history: this.convertMessages(messages) as Content[],
            });

            const lastMessage = messages.filter((m) => m.role === 'user').pop();
            if (!lastMessage) {
                throw new ProviderError(this.name, 'No user message found');
            }

            const result = await chat.sendMessageStream(lastMessage.content);

            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    yield { type: 'text', content: text };
                }

                // Check for function calls
                const functionCalls = chunk.functionCalls();
                if (functionCalls) {
                    for (const fc of functionCalls) {
                        const toolCall: ToolCall = {
                            id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                            name: fc.name,
                            arguments: fc.args as Record<string, unknown>,
                        };
                        yield { type: 'tool_call_start', toolCall };
                        yield { type: 'tool_call_end', toolCall };
                    }
                }
            }

            // Final response
            const response = await result.response;
            const functionCalls = response.functionCalls();

            yield {
                type: 'done',
                finishReason: functionCalls && functionCalls.length > 0 ? 'tool_use' : 'stop',
            };
        } catch (error) {
            throw this.handleError(error);
        }
    }

    getContextWindowSize(): number {
        return MODEL_CONTEXT_WINDOWS[this.model] ?? 1048576;
    }

    countTokens(text: string): number {
        // Gemini uses SentencePiece, roughly 4 chars per token
        return Math.ceil(text.length / 4);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Protected Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    protected convertMessages(messages: Message[]): Content[] {
        return messages
            .filter((m) => m.role !== 'system')
            .slice(0, -1) // Exclude last message (will be sent separately)
            .map((msg) => ({
                role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
                parts: [{ text: msg.content }] as Part[],
            }));
    }

    protected convertTools(tools: ToolDefinition[]): Tool[] {
        const functionDeclarations = tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: {
                type: SchemaType.OBJECT,
                properties: this.convertToolParameters(tool.parameters.properties),
                required: tool.parameters.required,
            },
        })) as FunctionDeclaration[];

        return [{ functionDeclarations }];
    }

    private convertToolParameters(
        properties: ToolDefinition['parameters']['properties']
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, param] of Object.entries(properties)) {
            result[key] = {
                type: this.mapSchemaType(param.type),
                description: param.description,
                ...(param.enum && { enum: param.enum }),
            };
        }

        return result;
    }

    private mapSchemaType(type: string): SchemaType {
        switch (type) {
            case 'string':
                return SchemaType.STRING;
            case 'number':
                return SchemaType.NUMBER;
            case 'boolean':
                return SchemaType.BOOLEAN;
            case 'array':
                return SchemaType.ARRAY;
            case 'object':
                return SchemaType.OBJECT;
            default:
                return SchemaType.STRING;
        }
    }

    private transformResponse(response: {
        text: () => string;
        functionCalls: () => Array<{ name: string; args: unknown }> | undefined;
        usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
        };
    }): AgentResponse {
        const toolCalls: ToolCall[] = [];
        const functionCalls = response.functionCalls();

        if (functionCalls) {
            for (const fc of functionCalls) {
                toolCalls.push({
                    id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: fc.name,
                    arguments: fc.args as Record<string, unknown>,
                });
            }
        }

        const usage = response.usageMetadata;

        return {
            content: response.text() ?? '',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
            usage: {
                inputTokens: usage?.promptTokenCount ?? 0,
                outputTokens: usage?.candidatesTokenCount ?? 0,
                totalTokens: usage?.totalTokenCount ?? 0,
            },
            model: this.model,
            provider: this.name,
        };
    }

    private handleError(error: unknown): Error {
        const message = error instanceof Error ? error.message : String(error);

        if (
            message.includes('API_KEY') ||
            message.includes('401') ||
            message.includes('UNAUTHENTICATED')
        ) {
            return new ProviderAuthError(this.name);
        }
        if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
            return new ProviderRateLimitError(this.name);
        }
        if (message.includes('503') || message.includes('UNAVAILABLE')) {
            return new ProviderUnavailableError(this.name, message);
        }

        return new ProviderError(this.name, message);
    }
}
