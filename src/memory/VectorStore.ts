/**
 * JARVIS Vector Store (Semantic Search)
 *
 * Provides semantic search capabilities using OpenAI or Gemini embeddings.
 * Can seamlessly integrate with a Supabase pgvector instance if configured,
 * or fall back to an in-memory/local cosine similarity search.
 */

import { logger } from '../utils/logger.js';
import type { MemoryEntry } from '../agent/types.js';

// Configuration
export interface VectorConfig {
    supabaseUrl?: string;
    supabaseKey?: string;
    defaultLimit?: number;
    similarityThreshold?: number;
}

export interface EmbeddingResult {
    vector: number[];
    dimensions: number;
}

export class VectorStore {
    private config: VectorConfig;
    private memoryCache: Map<string, number[]> = new Map();

    constructor(config: Partial<VectorConfig> = {}) {
        this.config = {
            supabaseUrl: process.env['SUPABASE_URL'],
            supabaseKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'],
            defaultLimit: 10,
            similarityThreshold: 0.75,
            ...config,
        };
    }

    /**
     * Checks if Supabase connection is configured and available
     */
    public hasRemoteVectorStore(): boolean {
        return !!(this.config.supabaseUrl && this.config.supabaseKey);
    }

    /**
     * Check if embedding API keys are available
     */
    public canGenerateEmbeddings(): boolean {
        return !!(process.env['OPENAI_API_KEY'] || process.env['GEMINI_API_KEY']);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Embeddings Generation
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Generate an embedding vector for a given text string.
     * Tries OpenAI first, then Gemini.
     */
    public async generateEmbedding(text: string): Promise<EmbeddingResult> {
        if (!text || text.trim().length === 0) {
            throw new Error('Cannot generate embedding for empty text');
        }

        // Try OpenAI first (text-embedding-3-small)
        const openaiKey = process.env['OPENAI_API_KEY'];
        if (openaiKey) {
            return this.generateOpenAIEmbedding(text, openaiKey);
        }

        // Try Gemini (text-embedding-004)
        const geminiKey = process.env['GEMINI_API_KEY'];
        if (geminiKey) {
            return this.generateGeminiEmbedding(text, geminiKey);
        }

        throw new Error('No embedding provider available (Missing OPENAI_API_KEY or GEMINI_API_KEY)');
    }

    private async generateOpenAIEmbedding(text: string, apiKey: string): Promise<EmbeddingResult> {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text,
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenAI Embedding error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { data: Array<{ embedding: number[] }> };
        const vector = data.data[0]?.embedding;
        
        if (!vector) throw new Error('No embedding returned from OpenAI');
        
        return { vector, dimensions: vector.length };
    }

    private async generateGeminiEmbedding(text: string, apiKey: string): Promise<EmbeddingResult> {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'models/text-embedding-004',
                    content: {
                        parts: [{ text }],
                    },
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Gemini Embedding error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json() as { embedding: { values: number[] } };
        const vector = data.embedding?.values;
        
        if (!vector) throw new Error('No embedding returned from Gemini');
        
        return { vector, dimensions: vector.length };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Vector Search & Storage
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Search memory using semantic similarity
     */
    public async semanticSearch(
        query: string, 
        entries: MemoryEntry[], 
        limit?: number
    ): Promise<MemoryEntry[]> {
        if (!this.canGenerateEmbeddings()) {
            logger.debug('Skipping semantic search: No embedding keys configured');
            return []; // Fall back to keyword search
        }

        const maxResults = limit ?? this.config.defaultLimit ?? 10;

        try {
            // Generate query embedding
            const queryResult = await this.generateEmbedding(query);
            
            // If we have Supabase configured, try remote search
            if (this.hasRemoteVectorStore()) {
                const results = await this.supabaseSearch(queryResult.vector, maxResults);
                if (results && results.length > 0) {
                    // Map IDs back to local entries
                    const remoteIds = new Set(results.map(r => r.id));
                    const remoteEntries = entries.filter(e => remoteIds.has(e.id));
                    // Sort to match remote ranking
                    return remoteEntries.sort((a, b) => {
                        const idxA = results.findIndex(r => r.id === a.id);
                        const idxB = results.findIndex(r => r.id === b.id);
                        return idxA - idxB;
                    });
                }
            }

            // Fallback: Local exact cosine similarity search
            return await this.localCosineSearch(queryResult.vector, entries, maxResults);

        } catch (err) {
            logger.warn('Semantic search failed, falling back to keyword search', { 
                error: err instanceof Error ? err.message : String(err) 
            });
            return [];
        }
    }

    /**
     * Save an embedded memory directly to Supabase if configured
     */
    public async upsertRemoteMemory(entry: MemoryEntry): Promise<void> {
        if (!this.hasRemoteVectorStore() || !this.canGenerateEmbeddings()) return;

        try {
            const { vector } = await this.generateEmbedding(entry.content);
            
            const response = await fetch(`${this.config.supabaseUrl}/rest/v1/memory_vectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.config.supabaseKey!,
                    'Authorization': `Bearer ${this.config.supabaseKey}`,
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    id: entry.id,
                    content: entry.content,
                    type: entry.type,
                    tags: entry.tags,
                    embedding: vector,
                    importance: entry.importance,
                    updated_at: entry.updatedAt.toISOString(),
                })
            });

            if (!response.ok) {
                logger.warn('Failed to sync vector to Supabase', { status: response.status });
            }
        } catch (err) {
            logger.warn('Vector sync error', { error: err instanceof Error ? err.message : String(err) });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Internal Implementations
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Call the Supabase match_memories RPC function
     */
    private async supabaseSearch(queryEmbedding: number[], matchCount: number): Promise<Array<{ id: string; similarity: number }>> {
        const response = await fetch(`${this.config.supabaseUrl}/rest/v1/rpc/match_memories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.config.supabaseKey!,
                'Authorization': `Bearer ${this.config.supabaseKey}`,
            },
            body: JSON.stringify({
                query_embedding: queryEmbedding,
                match_threshold: this.config.similarityThreshold,
                match_count: matchCount
            })
        });

        if (!response.ok) {
            throw new Error(`Supabase search failed: ${response.status}`);
        }

        return await response.json() as Array<{ id: string; similarity: number }>;
    }

    /**
     * Compute cosine similarity entirely in memory
     * Warning: Only efficient for small datasets (< 1000 entries) without caching
     */
    private async localCosineSearch(
        queryVector: number[], 
        entries: MemoryEntry[], 
        limit: number
    ): Promise<MemoryEntry[]> {
        
        // In a real environment, you'd cache embeddings rigorously.
        // For this demo/fallback, we dynamically generate missing ones.
        
        const scoredEntries: Array<{ entry: MemoryEntry; score: number }> = [];

        for (const entry of entries) {
            let vector = this.memoryCache.get(entry.id);
            
            if (!vector) {
                try {
                    const res = await this.generateEmbedding(entry.content);
                    vector = res.vector;
                    this.memoryCache.set(entry.id, vector); // Cache for session
                } catch {
                    continue; // Skip if we can't embed
                }
            }

            const score = this.cosineSimilarity(queryVector, vector);
            
            if (score >= (this.config.similarityThreshold ?? 0.75)) {
                scoredEntries.push({ entry, score });
            }
        }

        return scoredEntries
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(s => s.entry);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i]! * vecB[i]!;
            normA += vecA[i]! * vecA[i]!;
            normB += vecB[i]! * vecB[i]!;
        }
        
        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
    if (!vectorStore) {
        vectorStore = new VectorStore();
    }
    return vectorStore;
}
