/**
 * JARVIS Memory Reranker
 * 
 * Two-stage retrieval system for improved memory search relevance:
 * Stage 1: Fast keyword/embedding search → Top N candidates
 * Stage 2: LLM-based or cross-encoder reranking → Top K relevant
 */

import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemoryEntry {
    id: string;
    type: 'fact' | 'preference' | 'project' | 'context';
    content: string;
    tags?: string[];
    timestamp?: string;
    relevanceScore?: number;
}

export interface RerankingConfig {
    enabled: boolean;
    method: 'llm' | 'keyword-boost' | 'recency';
    candidateLimit: number;  // Stage 1 limit
    finalLimit: number;      // Stage 2 limit
    recencyWeight: number;   // 0-1, how much to weight recent entries
}

export interface ScoredEntry extends MemoryEntry {
    score: number;
    scoreBreakdown: {
        keyword: number;
        recency: number;
        type: number;
        rerank: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: RerankingConfig = {
    enabled: true,
    method: 'keyword-boost',
    candidateLimit: 50,
    finalLimit: 10,
    recencyWeight: 0.3,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Memory Reranker Class
// ═══════════════════════════════════════════════════════════════════════════════

export class MemoryReranker {
    private config: RerankingConfig;

    constructor(config: Partial<RerankingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Rerank a list of memory entries based on a query
     */
    async rerank(query: string, entries: MemoryEntry[]): Promise<ScoredEntry[]> {
        if (!this.config.enabled || entries.length <= this.config.finalLimit) {
            return entries.map(e => this.addDefaultScore(e));
        }

        logger.debug('Reranking memory entries', {
            query,
            candidateCount: entries.length,
            method: this.config.method,
        });

        switch (this.config.method) {
            case 'keyword-boost':
                return this.keywordBoostRerank(query, entries);
            case 'recency':
                return this.recencyRerank(entries);
            case 'llm':
                return this.llmRerank(query, entries);
            default:
                return entries.slice(0, this.config.finalLimit).map(e => this.addDefaultScore(e));
        }
    }

    /**
     * Keyword-based reranking with TF-IDF-like scoring
     */
    private keywordBoostRerank(query: string, entries: MemoryEntry[]): ScoredEntry[] {
        const queryTerms = this.tokenize(query);

        const scored = entries.map(entry => {
            const contentTerms = this.tokenize(entry.content);
            const tagTerms = (entry.tags ?? []).flatMap(t => this.tokenize(t));

            // Keyword matching score
            const keywordScore = this.calculateTermOverlap(queryTerms, [...contentTerms, ...tagTerms]);

            // Recency score (0-1)
            const recencyScore = this.calculateRecencyScore(entry.timestamp);

            // Type priority (preferences > facts > projects > context)
            const typeScore = this.getTypeScore(entry.type);

            // Combined score
            const totalScore = (
                keywordScore * 0.5 +
                recencyScore * this.config.recencyWeight +
                typeScore * (1 - this.config.recencyWeight - 0.5)
            );

            return {
                ...entry,
                score: totalScore,
                scoreBreakdown: {
                    keyword: keywordScore,
                    recency: recencyScore,
                    type: typeScore,
                    rerank: 0,
                },
            };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, this.config.finalLimit);
    }

    /**
     * Recency-only reranking (most recent first)
     */
    private recencyRerank(entries: MemoryEntry[]): ScoredEntry[] {
        const scored = entries.map(entry => {
            const recencyScore = this.calculateRecencyScore(entry.timestamp);

            return {
                ...entry,
                score: recencyScore,
                scoreBreakdown: {
                    keyword: 0,
                    recency: recencyScore,
                    type: 0,
                    rerank: 0,
                },
            };
        });

        return scored
            .sort((a, b) => b.score - a.score)
            .slice(0, this.config.finalLimit);
    }

    /**
     * LLM-based reranking (requires LLM provider)
     * Falls back to keyword-boost if no LLM available
     */
    private async llmRerank(query: string, entries: MemoryEntry[]): Promise<ScoredEntry[]> {
        // For now, use keyword-boost as fallback
        // TODO: Integrate with LLM provider when available
        logger.debug('LLM reranking not yet implemented, using keyword-boost fallback');
        return this.keywordBoostRerank(query, entries);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Scoring Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 2);
    }

    private calculateTermOverlap(queryTerms: string[], contentTerms: string[]): number {
        if (queryTerms.length === 0) return 0;

        const contentSet = new Set(contentTerms);
        const matches = queryTerms.filter(term => contentSet.has(term));

        // Jaccard-like similarity
        const intersection = matches.length;
        const union = new Set([...queryTerms, ...contentTerms]).size;

        return union > 0 ? intersection / union : 0;
    }

    private calculateRecencyScore(timestamp?: string): number {
        if (!timestamp) return 0.5; // Neutral score for entries without timestamp

        const entryTime = new Date(timestamp).getTime();
        const now = Date.now();
        const age = now - entryTime;

        // Decay over 30 days
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const decayScore = Math.max(0, 1 - (age / thirtyDays));

        return decayScore;
    }

    private getTypeScore(type: string): number {
        switch (type) {
            case 'preference':
                return 1.0;  // Highest priority
            case 'fact':
                return 0.8;
            case 'project':
                return 0.6;
            case 'context':
                return 0.4;
            default:
                return 0.5;
        }
    }

    private addDefaultScore(entry: MemoryEntry): ScoredEntry {
        return {
            ...entry,
            score: 1,
            scoreBreakdown: {
                keyword: 0,
                recency: 0,
                type: 0,
                rerank: 0,
            },
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Configuration
    // ─────────────────────────────────────────────────────────────────────────────

    updateConfig(config: Partial<RerankingConfig>): void {
        this.config = { ...this.config, ...config };
    }

    getConfig(): RerankingConfig {
        return { ...this.config };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let rerankerInstance: MemoryReranker | null = null;

export function getMemoryReranker(config?: Partial<RerankingConfig>): MemoryReranker {
    if (!rerankerInstance) {
        rerankerInstance = new MemoryReranker(config);
    }
    return rerankerInstance;
}

export function resetMemoryReranker(): void {
    rerankerInstance = null;
}
