/**
 * JARVIS Hierarchical Memory System
 * 
 * Integrates all memory layers to prevent "context rot" (memory pollution
 * from outdated or irrelevant information).
 * 
 * Memory Layer Architecture:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Layer 1: WORKING MEMORY                                                │
 * │ Current conversation context, active tasks, immediate goals            │
 * │ Retention: Current session only                                        │
 * │ Storage: In-memory                                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Layer 2: EPISODIC MEMORY                                               │
 * │ Summarized past sessions, key decisions, task completions              │
 * │ Retention: 30 days (configurable)                                      │
 * │ Storage: JSON file (episodes.json)                                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Layer 3: SEMANTIC MEMORY                                               │
 * │ User facts, preferences, learned patterns                              │
 * │ Retention: Permanent (manually managed)                                │
 * │ Storage: JSON file (memory.json via MemoryManager)                     │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Layer 4: VECTOR STORE                                                  │
 * │ Searchable knowledge, embeddings for similarity search                 │
 * │ Retention: Permanent                                                   │
 * │ Storage: SQLite/VectorDB (via MemoryReranker)                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import { MemoryManager, getMemoryManager } from './MemoryManager.js';
import { EpisodicMemory, getEpisodicMemory, type Episode } from './EpisodicMemory.js';
import { getMemoryReranker, type ScoredEntry } from './MemoryReranker.js';
import type { MemoryEntry, Message } from '../agent/types.js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface HierarchicalMemoryOptions {
    workingMemorySize?: number;      // Max messages in working memory
    episodicRetentionDays?: number;  // Days to keep episodes
    semanticRetrievalLimit?: number; // Max semantic memories to retrieve
    episodicRetrievalLimit?: number; // Max episodes to retrieve
}

export interface MemoryContext {
    working: Message[];               // Current conversation
    episodic: Episode[];              // Recent session highlights
    semantic: MemoryEntry[];          // Relevant user facts
    vectorResults?: ScoredEntry[];    // Similarity search results
}

export interface MemoryRetrievalQuery {
    query: string;
    includeWorking?: boolean;
    includeEpisodic?: boolean;
    includeSemantic?: boolean;
    includeVector?: boolean;
    limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hierarchical Memory
// ═══════════════════════════════════════════════════════════════════════════════

export class HierarchicalMemory {
    private options: Required<HierarchicalMemoryOptions>;
    private workingMemory: Message[] = [];
    private semanticMemory: MemoryManager;
    private episodicMemory: EpisodicMemory;
    private sessionId: string;
    private sessionStartTime: Date;

    constructor(options: HierarchicalMemoryOptions = {}) {
        this.options = {
            workingMemorySize: options.workingMemorySize ?? 50,
            episodicRetentionDays: options.episodicRetentionDays ?? 30,
            semanticRetrievalLimit: options.semanticRetrievalLimit ?? 10,
            episodicRetrievalLimit: options.episodicRetrievalLimit ?? 3,
        };

        this.semanticMemory = getMemoryManager();
        this.episodicMemory = getEpisodicMemory({
            retentionDays: this.options.episodicRetentionDays,
        });

        this.sessionId = `session_${Date.now()}`;
        this.sessionStartTime = new Date();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        await this.semanticMemory.initialize();
        await this.episodicMemory.initialize();

        logger.info('HierarchicalMemory initialized', {
            sessionId: this.sessionId,
            workingMemorySize: this.options.workingMemorySize,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Working Memory (Layer 1)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Add a message to working memory
     */
    addToWorkingMemory(message: Message): void {
        this.workingMemory.push(message);

        // Maintain size limit (keep most recent)
        if (this.workingMemory.length > this.options.workingMemorySize) {
            // Keep system message if present, remove oldest user/assistant
            const systemIdx = this.workingMemory.findIndex(m => m.role === 'system');
            if (systemIdx >= 0 && systemIdx < this.workingMemory.length - this.options.workingMemorySize) {
                // System message is outside window, remove from regular position
                const removed = this.workingMemory.splice(1, 1);
                logger.debug('Working memory overflow, removed message', { role: removed[0]?.role });
            } else {
                this.workingMemory.shift();
            }
        }
    }

    /**
     * Get current working memory
     */
    getWorkingMemory(): Message[] {
        return [...this.workingMemory];
    }

    /**
     * Clear working memory (start fresh)
     */
    clearWorkingMemory(): void {
        this.workingMemory = [];
    }

    /**
     * Get working memory token estimate
     */
    getWorkingMemoryTokens(): number {
        const content = this.workingMemory.map(m => m.content).join(' ');
        return Math.ceil(content.length / 4); // Rough estimate
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Episodic Memory (Layer 2)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Save current session as an episode
     */
    async saveSession(): Promise<Episode | null> {
        if (this.workingMemory.length < 2) {
            return null; // Not enough for meaningful episode
        }

        const duration = Math.floor(
            (Date.now() - this.sessionStartTime.getTime()) / 60000
        );

        const episode = await this.episodicMemory.recordSession(
            this.sessionId,
            this.workingMemory.map(m => ({
                role: m.role,
                content: m.content,
            })),
            { duration }
        );

        logger.info('Session saved as episode', {
            sessionId: this.sessionId,
            highlights: episode.highlights.length,
            duration,
        });

        return episode;
    }

    /**
     * Get recent episodes for context
     */
    async getRecentEpisodes(): Promise<Episode[]> {
        return this.episodicMemory.getRecent(this.options.episodicRetrievalLimit);
    }

    /**
     * Get episodic context formatted for prompt
     */
    async getEpisodicContext(): Promise<string> {
        return this.episodicMemory.getEpisodicContext(this.options.episodicRetrievalLimit);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Semantic Memory (Layer 3)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Remember a fact about the user
     */
    async rememberFact(content: string, tags?: string[]): Promise<MemoryEntry> {
        return this.semanticMemory.add({
            type: 'fact',
            content,
            source: 'hierarchical-memory',
            tags: tags ?? [],
            importance: 5,
        });
    }

    /**
     * Remember a user preference
     */
    async rememberPreference(content: string): Promise<MemoryEntry> {
        return this.semanticMemory.add({
            type: 'preference',
            content,
            source: 'hierarchical-memory',
            tags: [],
            importance: 8,
        });
    }

    /**
     * Search semantic memory
     */
    async searchSemantic(query: string): Promise<MemoryEntry[]> {
        const results = await this.semanticMemory.search(query);
        return results.slice(0, this.options.semanticRetrievalLimit);
    }

    /**
     * Get semantic context formatted for prompt
     */
    async getSemanticContext(): Promise<string> {
        const preferences = await this.semanticMemory.getByType('preference');
        const facts = await this.semanticMemory.getByType('fact');

        const lines: string[] = [];

        if (preferences.length > 0) {
            lines.push('## User Preferences');
            for (const pref of preferences.slice(0, 5)) {
                lines.push(`- ${pref.content}`);
            }
        }

        if (facts.length > 0) {
            lines.push('\n## Known Facts');
            for (const fact of facts.slice(0, 5)) {
                lines.push(`- ${fact.content}`);
            }
        }

        return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Unified Retrieval
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Retrieve relevant context from all memory layers
     */
    async retrieve(query: MemoryRetrievalQuery): Promise<MemoryContext> {
        const context: MemoryContext = {
            working: [],
            episodic: [],
            semantic: [],
        };

        // Layer 1: Working memory
        if (query.includeWorking !== false) {
            context.working = this.getWorkingMemory();
        }

        // Layer 2: Episodic memory
        if (query.includeEpisodic !== false) {
            context.episodic = await this.episodicMemory.search({
                keywords: query.query.split(' '),
                limit: query.limit ?? this.options.episodicRetrievalLimit,
            });
        }

        // Layer 3: Semantic memory
        if (query.includeSemantic !== false) {
            context.semantic = await this.searchSemantic(query.query);
        }

        // Layer 4: Vector store (optional) - use reranker on semantic results
        if (query.includeVector && context.semantic.length > 0) {
            const reranker = getMemoryReranker();
            context.vectorResults = await reranker.rerank(
                query.query,
                context.semantic.map(m => ({
                    id: m.id,
                    type: m.type as 'fact' | 'preference' | 'project' | 'context',
                    content: m.content,
                    tags: m.tags,
                }))
            );
        }

        return context;
    }

    /**
     * Get combined context for agent prompt
     */
    async getFullContext(): Promise<string> {
        const parts: string[] = [];

        // Episodic context (what happened recently)
        const episodic = await this.getEpisodicContext();
        if (episodic) {
            parts.push(episodic);
        }

        // Semantic context (what we know about user)
        const semantic = await this.getSemanticContext();
        if (semantic) {
            parts.push(semantic);
        }

        return parts.join('\n\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Session Management
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * End current session and start a new one
     */
    async endSession(): Promise<void> {
        // Save current session as episode
        await this.saveSession();

        // Clear working memory
        this.clearWorkingMemory();

        // Start new session
        this.sessionId = `session_${Date.now()}`;
        this.sessionStartTime = new Date();

        logger.info('Session ended', { newSessionId: this.sessionId });
    }

    getSessionId(): string {
        return this.sessionId;
    }

    getSessionDuration(): number {
        return Math.floor(
            (Date.now() - this.sessionStartTime.getTime()) / 60000
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────────

    async getStats(): Promise<{
        working: { messages: number; tokens: number };
        episodic: { episodes: number };
        semantic: { entries: number };
    }> {
        const episodicStats = this.episodicMemory.getStats();
        const semanticEntries = await this.semanticMemory.search('');

        return {
            working: {
                messages: this.workingMemory.length,
                tokens: this.getWorkingMemoryTokens(),
            },
            episodic: {
                episodes: episodicStats.totalEpisodes,
            },
            semantic: {
                entries: semanticEntries.length,
            },
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let hierarchicalMemoryInstance: HierarchicalMemory | null = null;

export function getHierarchicalMemory(
    options?: HierarchicalMemoryOptions
): HierarchicalMemory {
    if (!hierarchicalMemoryInstance) {
        hierarchicalMemoryInstance = new HierarchicalMemory(options);
    }
    return hierarchicalMemoryInstance;
}

export async function initializeHierarchicalMemory(
    options?: HierarchicalMemoryOptions
): Promise<HierarchicalMemory> {
    hierarchicalMemoryInstance = new HierarchicalMemory(options);
    await hierarchicalMemoryInstance.initialize();
    return hierarchicalMemoryInstance;
}

export function resetHierarchicalMemory(): void {
    hierarchicalMemoryInstance = null;
}
