/**
 * JARVIS Context Manager
 * 
 * Manages conversation context, token budgets, and context window optimization.
 * Ensures efficient token usage while preserving critical context.
 */

import type { Message } from '../agent/types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ContextOverflowError } from '../utils/errors.js';
import type { LLMProvider } from '../providers/LLMProvider.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Context Manager
// ═══════════════════════════════════════════════════════════════════════════════

export interface ContextStats {
    messageCount: number;
    totalTokens: number;
    systemPromptTokens: number;
    memoryTokens: number;
    conversationTokens: number;
    availableTokens: number;
    usagePercent: number;
}

export interface ContextManagerOptions {
    maxContextTokens?: number;
    reserveTokensForResponse?: number;
    systemPrompt?: string;
    memory?: string;
}

export class ContextManager {
    private messages: Message[] = [];
    private systemPrompt: string = '';
    private memory: string = '';
    private maxContextTokens: number;
    private reserveTokensForResponse: number;
    private provider: LLMProvider | null = null;

    constructor(options: ContextManagerOptions = {}) {
        const config = getConfig();
        this.maxContextTokens = options.maxContextTokens ?? config.agent.maxContextTokens;
        this.reserveTokensForResponse = options.reserveTokensForResponse ?? config.agent.maxResponseTokens;
        this.systemPrompt = options.systemPrompt ?? '';
        this.memory = options.memory ?? '';
    }

    /**
     * Set the LLM provider for accurate token counting
     */
    setProvider(provider: LLMProvider): void {
        this.provider = provider;
        // Update max context based on provider's context window
        const providerMax = provider.getContextWindowSize();
        if (providerMax < this.maxContextTokens) {
            this.maxContextTokens = providerMax;
            logger.debug(`Context window adjusted to ${providerMax} tokens for ${provider.name}`);
        }
    }

    /**
     * Set the system prompt
     */
    setSystemPrompt(prompt: string): void {
        this.systemPrompt = prompt;
    }

    /**
     * Set memory context
     */
    setMemory(memory: string): void {
        this.memory = memory;
    }

    /**
     * Add a message to the context
     */
    addMessage(message: Message): void {
        this.messages.push({
            ...message,
            timestamp: message.timestamp ?? new Date(),
        });
    }

    /**
     * Add multiple messages
     */
    addMessages(messages: Message[]): void {
        for (const msg of messages) {
            this.addMessage(msg);
        }
    }

    /**
     * Get all messages
     */
    getMessages(): Message[] {
        return [...this.messages];
    }

    /**
     * Get the system prompt with memory injected
     */
    getFullSystemPrompt(): string {
        if (!this.memory) {
            return this.systemPrompt;
        }

        return `${this.systemPrompt}

<persistent_memory>
${this.memory}
</persistent_memory>`;
    }

    /**
     * Get messages optimized for the context window
     * Trims older messages if necessary while preserving structure
     */
    getOptimizedMessages(): Message[] {
        const stats = this.getStats();

        if (stats.usagePercent < 80) {
            // Plenty of room, return all messages
            return this.getMessages();
        }

        logger.debug('Context optimization needed', { usagePercent: stats.usagePercent });

        // Calculate how many tokens we need to free
        const targetTokens = Math.floor(this.maxContextTokens * 0.7); // Target 70% usage
        const tokensToFree = stats.totalTokens - targetTokens;

        return this.trimMessages(tokensToFree);
    }

    /**
     * Check if adding content would overflow the context
     */
    wouldOverflow(additionalTokens: number): boolean {
        const stats = this.getStats();
        return (stats.totalTokens + additionalTokens) >
            (this.maxContextTokens - this.reserveTokensForResponse);
    }

    /**
     * Get context statistics
     */
    getStats(): ContextStats {
        const systemPromptTokens = this.countTokens(this.getFullSystemPrompt());
        const memoryTokens = this.memory ? this.countTokens(this.memory) : 0;

        let conversationTokens = 0;
        for (const msg of this.messages) {
            conversationTokens += this.countTokens(msg.content);
        }

        const totalTokens = systemPromptTokens + conversationTokens;
        const availableTokens = this.maxContextTokens - this.reserveTokensForResponse - totalTokens;

        return {
            messageCount: this.messages.length,
            totalTokens,
            systemPromptTokens,
            memoryTokens,
            conversationTokens,
            availableTokens: Math.max(0, availableTokens),
            usagePercent: Math.round((totalTokens / this.maxContextTokens) * 100),
        };
    }

    /**
     * Clear all messages (keeps system prompt and memory)
     */
    clearMessages(): void {
        this.messages = [];
    }

    /**
     * Clear everything
     */
    reset(): void {
        this.messages = [];
        this.systemPrompt = '';
        this.memory = '';
    }

    /**
     * Get the last N messages
     */
    getLastMessages(count: number): Message[] {
        return this.messages.slice(-count);
    }

    /**
     * Remove the last message (useful for retry scenarios)
     */
    popLastMessage(): Message | undefined {
        return this.messages.pop();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private countTokens(text: string): number {
        if (this.provider) {
            return this.provider.countTokens(text);
        }
        // Fallback: ~4 characters per token
        return Math.ceil(text.length / 4);
    }

    private trimMessages(tokensToFree: number): Message[] {
        const messages = [...this.messages];
        let freedTokens = 0;
        let trimIndex = 0;

        // Always keep the first message (often important context)
        // and the last few messages (recent context)
        const keepFirst = 1;
        const keepLast = 4;

        // Only trim from the middle
        const trimRange = messages.slice(keepFirst, -keepLast);

        for (let i = 0; i < trimRange.length && freedTokens < tokensToFree; i++) {
            const msg = trimRange[i];
            if (msg) {
                freedTokens += this.countTokens(msg.content);
                trimIndex = i + 1;
            }
        }

        if (trimIndex > 0) {
            // Create a summary message for trimmed content
            const trimmedCount = trimIndex;
            const summaryMessage: Message = {
                role: 'system',
                content: `[${trimmedCount} earlier messages summarized to save context]`,
                timestamp: new Date(),
            };

            const result = [
                ...messages.slice(0, keepFirst),
                summaryMessage,
                ...messages.slice(keepFirst + trimIndex),
            ];

            logger.debug(`Trimmed ${trimmedCount} messages, freed ~${freedTokens} tokens`);
            return result;
        }

        return messages;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Token Counter Utility
// ═══════════════════════════════════════════════════════════════════════════════

export class TokenCounter {
    /**
     * Approximate token count using character-based heuristic
     * Good for estimation, use provider-specific counting for accuracy
     */
    static approximate(text: string): number {
        return Math.ceil(text.length / 4);
    }

    /**
     * Count tokens for a message array
     */
    static countMessages(messages: Message[]): number {
        let total = 0;
        for (const msg of messages) {
            total += this.approximate(msg.content);
            // Add overhead for message structure (~4 tokens per message)
            total += 4;
        }
        return total;
    }

    /**
     * Estimate if content fits within a token budget
     */
    static fitsInBudget(text: string, budget: number, margin: number = 0.1): boolean {
        const tokens = this.approximate(text);
        const effectiveBudget = budget * (1 - margin);
        return tokens <= effectiveBudget;
    }
}
