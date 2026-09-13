/**
 * JARVIS Session Compactor
 * 
 * Compresses long conversation histories to save tokens while
 * preserving critical context. Implements intelligent summarization.
 */

import type { Message, SessionSummary } from '../agent/types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { LLMProvider } from '../providers/LLMProvider.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Compaction Strategy
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompactionResult {
    compactedMessages: Message[];
    summary: SessionSummary;
    originalTokens: number;
    compactedTokens: number;
    tokensSaved: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Compactor
// ═══════════════════════════════════════════════════════════════════════════════

export class SessionCompactor {
    private threshold: number;

    constructor(threshold?: number) {
        const config = getConfig();
        this.threshold = threshold ?? config.memory.compactionThreshold;
    }

    /**
     * Check if messages need compaction
     */
    needsCompaction(messages: Message[]): boolean {
        return messages.length > this.threshold;
    }

    /**
     * Compact messages using simple extraction (no LLM required)
     */
    compactSimple(messages: Message[]): CompactionResult {
        if (!this.needsCompaction(messages)) {
            return {
                compactedMessages: messages,
                summary: this.createEmptySummary(messages),
                originalTokens: this.estimateTokens(messages),
                compactedTokens: this.estimateTokens(messages),
                tokensSaved: 0,
            };
        }

        logger.memory('Starting simple compaction', { messageCount: messages.length });

        const originalTokens = this.estimateTokens(messages);

        // Keep first 2 messages (initial context) and last 10 messages (recent context)
        const keepFirst = 2;
        const keepLast = 10;

        const toCompact = messages.slice(keepFirst, -keepLast);
        const keyPoints = this.extractKeyPoints(toCompact);

        // Create summary message
        const summaryContent = this.formatSummary(keyPoints, toCompact.length);
        const summaryMessage: Message = {
            role: 'system',
            content: summaryContent,
            timestamp: new Date(),
        };

        const compactedMessages = [
            ...messages.slice(0, keepFirst),
            summaryMessage,
            ...messages.slice(-keepLast),
        ];

        const compactedTokens = this.estimateTokens(compactedMessages);

        const result: CompactionResult = {
            compactedMessages,
            summary: {
                id: `session-${Date.now()}`,
                summary: summaryContent,
                keyPoints,
                createdAt: new Date(),
                messageCount: messages.length,
                tokensSaved: originalTokens - compactedTokens,
            },
            originalTokens,
            compactedTokens,
            tokensSaved: originalTokens - compactedTokens,
        };

        logger.memory('Compaction complete', {
            originalMessages: messages.length,
            compactedMessages: compactedMessages.length,
            tokensSaved: result.tokensSaved,
        });

        return result;
    }

    /**
     * Compact messages using LLM for intelligent summarization
     */
    async compactWithLLM(
        messages: Message[],
        provider: LLMProvider
    ): Promise<CompactionResult> {
        if (!this.needsCompaction(messages)) {
            return {
                compactedMessages: messages,
                summary: this.createEmptySummary(messages),
                originalTokens: this.estimateTokens(messages),
                compactedTokens: this.estimateTokens(messages),
                tokensSaved: 0,
            };
        }

        logger.memory('Starting LLM-powered compaction', { messageCount: messages.length });

        const originalTokens = this.estimateTokens(messages);

        // Keep first 2 and last 10 messages
        const keepFirst = 2;
        const keepLast = 10;

        const toCompact = messages.slice(keepFirst, -keepLast);

        // Generate LLM summary
        const summaryPrompt = this.createSummaryPrompt(toCompact);

        try {
            const response = await provider.generateResponse(
                [{ role: 'user', content: summaryPrompt }],
                'You are a conversation summarizer. Extract key information concisely.',
                undefined,
                { maxTokens: 500, temperature: 0.3 }
            );

            const keyPoints = this.parseKeyPoints(response.content);
            const summaryContent = `[Conversation Summary - ${toCompact.length} messages]\n${response.content}`;

            const summaryMessage: Message = {
                role: 'system',
                content: summaryContent,
                timestamp: new Date(),
            };

            const compactedMessages = [
                ...messages.slice(0, keepFirst),
                summaryMessage,
                ...messages.slice(-keepLast),
            ];

            const compactedTokens = this.estimateTokens(compactedMessages);

            return {
                compactedMessages,
                summary: {
                    id: `session-${Date.now()}`,
                    summary: response.content,
                    keyPoints,
                    createdAt: new Date(),
                    messageCount: messages.length,
                    tokensSaved: originalTokens - compactedTokens,
                },
                originalTokens,
                compactedTokens,
                tokensSaved: originalTokens - compactedTokens,
            };
        } catch (error) {
            logger.warn('LLM compaction failed, falling back to simple', { error });
            return this.compactSimple(messages);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private extractKeyPoints(messages: Message[]): string[] {
        const keyPoints: string[] = [];

        // Extract questions and their answers
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            if (!msg) continue;

            // Look for questions
            if (msg.role === 'user' && msg.content.includes('?')) {
                const question = msg.content.split('?')[0] + '?';
                if (question.length < 100) {
                    keyPoints.push(`Q: ${question.slice(0, 80)}`);
                }
            }

            // Look for decisions/confirmations
            if (msg.content.toLowerCase().includes('decided') ||
                msg.content.toLowerCase().includes('confirmed') ||
                msg.content.toLowerCase().includes('will do')) {
                const snippet = msg.content.slice(0, 80);
                keyPoints.push(`Decision: ${snippet}`);
            }
        }

        // Limit to 10 key points
        return keyPoints.slice(0, 10);
    }

    private formatSummary(keyPoints: string[], messageCount: number): string {
        if (keyPoints.length === 0) {
            return `[Earlier conversation: ${messageCount} messages summarized]`;
        }

        return `[Conversation Summary - ${messageCount} messages]
Key points from earlier discussion:
${keyPoints.map(p => `• ${p}`).join('\n')}`;
    }

    private createSummaryPrompt(messages: Message[]): string {
        const conversation = messages
            .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}${m.content.length > 200 ? '...' : ''}`)
            .join('\n\n');

        return `Summarize this conversation, extracting:
1. Key decisions made
2. Important information shared
3. Tasks or commitments mentioned
4. User preferences expressed

Keep the summary under 300 words.

CONVERSATION:
${conversation}`;
    }

    private parseKeyPoints(summary: string): string[] {
        // Extract bullet points or numbered items from summary
        const lines = summary.split('\n');
        return lines
            .filter(line => line.match(/^[\s]*[-•*\d.]\s*/))
            .map(line => line.replace(/^[\s]*[-•*\d.]\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 10);
    }

    private createEmptySummary(messages: Message[]): SessionSummary {
        return {
            id: `session-${Date.now()}`,
            summary: '',
            keyPoints: [],
            createdAt: new Date(),
            messageCount: messages.length,
            tokensSaved: 0,
        };
    }

    private estimateTokens(messages: Message[]): number {
        let total = 0;
        for (const msg of messages) {
            total += Math.ceil(msg.content.length / 4) + 4; // +4 for message overhead
        }
        return total;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export Types
// ═══════════════════════════════════════════════════════════════════════════════

export type { MemoryEntry, SessionSummary } from '../agent/types.js';
