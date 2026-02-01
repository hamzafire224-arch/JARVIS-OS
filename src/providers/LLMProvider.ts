/**
 * JARVIS LLM Provider Interface
 * 
 * Abstract interface that all LLM providers must implement.
 * Ensures model-agnostic architecture with consistent API.
 */

import type { Message, ToolDefinition, AgentResponse, StreamChunk } from '../agent/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Provider Interface
// ═══════════════════════════════════════════════════════════════════════════════

export interface LLMProviderOptions {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
}

export interface LLMProvider {
    /** Provider identifier (e.g., 'anthropic', 'openai') */
    readonly name: string;

    /** Model identifier currently in use */
    readonly model: string;

    /** Check if the provider is available and configured */
    isAvailable(): Promise<boolean>;

    /** Generate a complete response */
    generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): Promise<AgentResponse>;

    /** Generate a streaming response */
    streamResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): AsyncGenerator<StreamChunk>;

    /** Estimate token count for text (approximate) */
    countTokens(text: string): number;

    /** Get the context window size for current model */
    getContextWindowSize(): number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Base Provider Class
// ═══════════════════════════════════════════════════════════════════════════════

export abstract class BaseLLMProvider implements LLMProvider {
    abstract readonly name: string;
    abstract readonly model: string;

    abstract isAvailable(): Promise<boolean>;

    abstract generateResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): Promise<AgentResponse>;

    abstract streamResponse(
        messages: Message[],
        systemPrompt: string,
        tools?: ToolDefinition[],
        options?: LLMProviderOptions
    ): AsyncGenerator<StreamChunk>;

    abstract getContextWindowSize(): number;

    /**
     * Default token counting using cl100k_base approximation.
     * ~4 characters per token on average for English text.
     * Override in provider-specific implementations for accuracy.
     */
    countTokens(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Helper to convert tool definitions to provider-specific format.
     * Override in subclasses.
     */
    protected abstract convertTools(tools: ToolDefinition[]): unknown;

    /**
     * Helper to convert messages to provider-specific format.
     * Override in subclasses.
     */
    protected abstract convertMessages(messages: Message[], systemPrompt?: string): unknown;

    /**
     * Retry helper with exponential backoff
     */
    protected async withRetry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        baseDelay: number = 1000
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Don't retry on auth errors
                if (lastError.message.includes('401') || lastError.message.includes('auth')) {
                    throw lastError;
                }

                // Exponential backoff
                const delay = baseDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError;
    }
}
