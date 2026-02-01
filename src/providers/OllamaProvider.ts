/**
 * JARVIS Ollama Provider
 * 
 * Local/offline LLM provider for privacy-first operation.
 * Supports various open-source models (llama3, mistral, etc.)
 */

import { Ollama } from 'ollama';
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
import { ProviderError, ProviderUnavailableError } from '../utils/errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Context Window Sizes by Model
// ═══════════════════════════════════════════════════════════════════════════════

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
    'llama3:8b': 8192,
    'llama3:70b': 8192,
    'llama3.2:latest': 128000,
    'mistral:7b': 32768,
    'mixtral:8x7b': 32768,
    'codellama:34b': 16384,
    'deepseek-coder:33b': 16384,
    'qwen2.5-coder:32b': 32768,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Ollama Provider Implementation
// ═══════════════════════════════════════════════════════════════════════════════

export class OllamaProvider extends BaseLLMProvider {
    readonly name = 'ollama';
    readonly model: string;

    private client: Ollama;
    private baseUrl: string;

    constructor() {
        super();
        const config = getConfig();
        this.model = config.providers.ollama.model;
        this.baseUrl = config.providers.ollama.baseUrl;

        this.client = new Ollama({ host: this.baseUrl });
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Check if Ollama server is running
            const models = await this.client.list();
            const hasModel = models.models.some(m =>
                m.name === this.model || m.name.startsWith(this.model.split(':')[0] ?? '')
            );

            if (!hasModel) {
                logger.provider(this.name, `Model ${this.model} not found locally`);
                // Try to pull it
                logger.provider(this.name, `Attempting to pull ${this.model}...`);
                try {
                    await this.client.pull({ model: this.model });
                    logger.provider(this.name, `Successfully pulled ${this.model}`);
                } catch (pullError) {
                    logger.provider(this.name, `Failed to pull model: ${pullError}`);
                    return false;
                }
            }

            logger.provider(this.name, 'Available', { model: this.model });
            return true;
        } catch (error) {
            logger.provider(this.name, 'Not available - is Ollama server running?', {
                baseUrl: this.baseUrl,
                error: String(error),
            });
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
                    model: this.model,
                });

                const ollamaMessages = this.convertMessages(messages, systemPrompt);
                const ollamaTools = tools ? this.convertTools(tools) : undefined;

                const response = await this.client.chat({
                    model: this.model,
                    messages: ollamaMessages,
                    tools: ollamaTools as unknown as undefined,
                    options: {
                        temperature: options?.temperature ?? config.agent.temperature,
                        num_predict: options?.maxTokens ?? config.agent.maxResponseTokens,
                        stop: options?.stopSequences,
                    },
                });

                return this.transformResponse(response);
            } catch (error) {
                throw this.handleError(error);
            }
        }, 2, 2000); // Fewer retries, longer delay for local models
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
                model: this.model,
            });

            const ollamaMessages = this.convertMessages(messages, systemPrompt);
            const ollamaTools = tools ? this.convertTools(tools) : undefined;

            const stream = await this.client.chat({
                model: this.model,
                messages: ollamaMessages,
                tools: ollamaTools as unknown as undefined,
                stream: true,
                options: {
                    temperature: options?.temperature ?? config.agent.temperature,
                    num_predict: options?.maxTokens ?? config.agent.maxResponseTokens,
                    stop: options?.stopSequences,
                },
            });

            let inputTokens = 0;
            let outputTokens = 0;

            for await (const chunk of stream) {
                // Text content
                if (chunk.message?.content) {
                    yield { type: 'text', content: chunk.message.content };
                    outputTokens += this.countTokens(chunk.message.content);
                }

                // Tool calls (if model supports them)
                if (chunk.message?.tool_calls) {
                    for (const tc of chunk.message.tool_calls) {
                        const toolCall: ToolCall = {
                            id: `ollama-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                            name: tc.function?.name ?? 'unknown',
                            arguments: tc.function?.arguments ?? {},
                        };
                        yield { type: 'tool_call_start', toolCall };
                        yield { type: 'tool_call_end', toolCall };
                    }
                }

                // Done
                if (chunk.done) {
                    inputTokens = chunk.prompt_eval_count ?? 0;
                    outputTokens = chunk.eval_count ?? outputTokens;

                    yield {
                        type: 'done',
                        finishReason: chunk.message?.tool_calls ? 'tool_use' : 'stop',
                    };
                }
            }
        } catch (error) {
            throw this.handleError(error);
        }
    }

    getContextWindowSize(): number {
        const baseModel = this.model.split(':')[0] ?? this.model;
        return MODEL_CONTEXT_WINDOWS[this.model] ??
            MODEL_CONTEXT_WINDOWS[baseModel] ??
            8192; // Conservative default
    }

    countTokens(text: string): number {
        // Llama models use SentencePiece, roughly 4-5 chars per token
        return Math.ceil(text.length / 4.5);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Protected Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    protected convertMessages(
        messages: Message[],
        systemPrompt: string
    ): Array<{ role: string; content: string }> {
        const result: Array<{ role: string; content: string }> = [];

        // Add system prompt
        if (systemPrompt) {
            result.push({ role: 'system', content: systemPrompt });
        }

        // Convert messages
        for (const msg of messages) {
            if (msg.role === 'system') continue;
            result.push({
                role: msg.role,
                content: msg.content,
            });
        }

        return result;
    }

    protected convertTools(tools: ToolDefinition[]): unknown {
        // Ollama uses a similar format to OpenAI
        return tools.map(tool => ({
            type: 'function',
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
            };
        }

        return result;
    }

    private transformResponse(response: {
        message?: { content?: string; tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }> };
        prompt_eval_count?: number;
        eval_count?: number;
        model?: string;
    }): AgentResponse {
        const toolCalls: ToolCall[] = [];

        if (response.message?.tool_calls) {
            for (const tc of response.message.tool_calls) {
                toolCalls.push({
                    id: `ollama-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: tc.function?.name ?? 'unknown',
                    arguments: (tc.function?.arguments ?? {}) as Record<string, unknown>,
                });
            }
        }

        const inputTokens = response.prompt_eval_count ?? 0;
        const outputTokens = response.eval_count ?? 0;

        return {
            content: response.message?.content ?? '',
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            finishReason: toolCalls.length > 0 ? 'tool_use' : 'stop',
            usage: {
                inputTokens,
                outputTokens,
                totalTokens: inputTokens + outputTokens,
            },
            model: response.model ?? this.model,
            provider: this.name,
        };
    }

    private handleError(error: unknown): Error {
        const message = error instanceof Error ? error.message : String(error);

        // Connection errors
        if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
            return new ProviderUnavailableError(
                this.name,
                `Cannot connect to Ollama at ${this.baseUrl}. Is the server running?`
            );
        }

        // Model not found
        if (message.includes('not found') || message.includes('does not exist')) {
            return new ProviderUnavailableError(
                this.name,
                `Model ${this.model} not found. Run: ollama pull ${this.model}`
            );
        }

        return new ProviderError(this.name, message);
    }
}
