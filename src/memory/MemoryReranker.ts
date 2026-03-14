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
     * LLM-based reranking — uses cheap/local model to score relevance
     * Falls back to keyword-boost if LLM is unavailable or fails
     */
    private async llmRerank(query: string, entries: MemoryEntry[]): Promise<ScoredEntry[]> {
        try {
            // Dynamic import to avoid circular dependencies
            const { getTieredProviderManager } = await import('../providers/TieredProviderManager.js');
            const tiered = getTieredProviderManager();

            // Limit candidates to avoid huge prompts
            const candidates = entries.slice(0, this.config.candidateLimit);

            // Build a compact scoring prompt
            const memorySummaries = candidates.map(
                (e, i) => `[${i}] (${e.type}) ${e.content.slice(0, 200)}`
            ).join('\n');

            const systemPrompt =
                'You are a memory relevance scorer. Given a query and numbered memory entries, ' +
                'respond with ONLY a JSON array of scores. Each score is 0-10 (10 = most relevant). ' +
                'Format: [5, 8, 2, ...] — one score per entry, in order. No explanation.';

            const userMessage = `Query: "${query}"\n\nMemories:\n${memorySummaries}`;

            const response = await tiered.generateResponse(
                [{ role: 'user' as const, content: userMessage }],
                systemPrompt
            );

            // Parse the LLM scores
            const scoresMatch = response.content.match(/\[[\d\s,]+\]/);
            if (!scoresMatch) {
                logger.debug('LLM rerank: could not parse scores, falling back');
                return this.keywordBoostRerank(query, entries);
            }

            const llmScores: number[] = JSON.parse(scoresMatch[0]);

            // Combine LLM scores with keyword/recency scores
            const scored: ScoredEntry[] = candidates.map((entry, i) => {
                const llmScore = (llmScores[i] ?? 5) / 10; // Normalize to 0-1
                const keywordScore = this.calculateTermOverlap(
                    this.tokenize(query),
                    [...this.tokenize(entry.content), ...(entry.tags ?? []).flatMap(t => this.tokenize(t))]
                );
                const recencyScore = this.calculateRecencyScore(entry.timestamp);
                const typeScore = this.getTypeScore(entry.type);

                // LLM gets highest weight since it understands semantics
                const totalScore =
                    llmScore * 0.5 +
                    keywordScore * 0.2 +
                    recencyScore * this.config.recencyWeight * 0.3 +
                    typeScore * 0.1;

                return {
                    ...entry,
                    score: totalScore,
                    scoreBreakdown: {
                        keyword: keywordScore,
                        recency: recencyScore,
                        type: typeScore,
                        rerank: llmScore,
                    },
                };
            });

            logger.debug('LLM reranking complete', {
                query,
                candidates: candidates.length,
                topScore: scored.sort((a, b) => b.score - a.score)[0]?.score,
            });

            return scored
                .sort((a, b) => b.score - a.score)
                .slice(0, this.config.finalLimit);
        } catch (error) {
            // Graceful fallback — LLM not available or errored
            logger.debug('LLM reranking failed, using keyword-boost fallback', {
                error: error instanceof Error ? error.message : String(error),
            });
            return this.keywordBoostRerank(query, entries);
        }
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
