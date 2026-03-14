/**
 * JARVIS Episodic Memory
 * 
 * Stores summarized highlights of past sessions to prevent context rot.
 * Part of the hierarchical memory architecture:
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ WORKING MEMORY       │ Current conversation (RAM, session)     │
 * ├──────────────────────┼──────────────────────────────────────────┤
 * │ EPISODIC MEMORY      │ Summarized past sessions (JSON, weeks)  │ ← This file
 * ├──────────────────────┼──────────────────────────────────────────┤
 * │ SEMANTIC MEMORY      │ Facts about user (JSON, permanent)      │
 * ├──────────────────────┼──────────────────────────────────────────┤
 * │ VECTOR STORE         │ Searchable knowledge (sqlite, permanent)│
 * └──────────────────────┴──────────────────────────────────────────┘
 * 
 * Episodic memory captures:
 * - Key decisions made
 * - Important tasks completed
 * - Preferences discovered
 * - Errors and how they were resolved
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Episode {
    id: string;
    sessionId: string;
    timestamp: Date;
    summary: string;
    highlights: EpisodeHighlight[];
    decisions: string[];
    tasksCompleted: string[];
    errorsResolved: string[];
    preferencesLearned: string[];
    mood?: 'productive' | 'challenging' | 'exploratory' | 'routine';
    duration?: number;  // Session duration in minutes
    messageCount?: number;
}

export interface EpisodeHighlight {
    type: 'task' | 'decision' | 'learning' | 'error' | 'preference';
    content: string;
    importance: 'low' | 'medium' | 'high';
    timestamp?: Date;
}

export interface EpisodeQuery {
    keywords?: string[];
    dateRange?: { start: Date; end: Date };
    types?: EpisodeHighlight['type'][];
    limit?: number;
}

interface EpisodicStore {
    version: string;
    lastCompaction: string;
    episodes: Episode[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Session Compactor (converts conversation to episode)
// ═══════════════════════════════════════════════════════════════════════════════

export class SessionCompactor {
    /**
     * Extract highlights from conversation messages
     */
    compactSession(
        sessionId: string,
        messages: Array<{ role: string; content: string; timestamp?: Date }>,
        metadata?: { duration?: number }
    ): Episode {
        const highlights: EpisodeHighlight[] = [];
        const decisions: string[] = [];
        const tasksCompleted: string[] = [];
        const errorsResolved: string[] = [];
        const preferencesLearned: string[] = [];

        // Analyze messages for important content
        for (const msg of messages) {
            if (msg.role === 'assistant') {
                // Look for task completions
                const taskMatches = msg.content.match(/(?:completed|finished|done with|created|implemented|fixed)\s+(.{10,100})/gi);
                if (taskMatches) {
                    for (const match of taskMatches.slice(0, 3)) {
                        tasksCompleted.push(match.trim());
                        highlights.push({
                            type: 'task',
                            content: match.trim(),
                            importance: 'medium',
                        });
                    }
                }

                // Look for decisions
                const decisionMatches = msg.content.match(/(?:decided to|we'll|I recommend|going with|choosing)\s+(.{10,100})/gi);
                if (decisionMatches) {
                    for (const match of decisionMatches.slice(0, 2)) {
                        decisions.push(match.trim());
                        highlights.push({
                            type: 'decision',
                            content: match.trim(),
                            importance: 'high',
                        });
                    }
                }

                // Look for error resolutions
                const errorMatches = msg.content.match(/(?:fixed|resolved|solved|the issue was|error was)\s+(.{10,100})/gi);
                if (errorMatches) {
                    for (const match of errorMatches.slice(0, 2)) {
                        errorsResolved.push(match.trim());
                        highlights.push({
                            type: 'error',
                            content: match.trim(),
                            importance: 'medium',
                        });
                    }
                }
            }

            if (msg.role === 'user') {
                // Look for preferences
                const prefMatches = msg.content.match(/(?:I prefer|I like|I want|always use|never use|I hate)\s+(.{5,50})/gi);
                if (prefMatches) {
                    for (const match of prefMatches.slice(0, 2)) {
                        preferencesLearned.push(match.trim());
                        highlights.push({
                            type: 'preference',
                            content: match.trim(),
                            importance: 'high',
                        });
                    }
                }
            }
        }

        // Generate summary
        const summary = this.generateSummary(tasksCompleted, decisions, errorsResolved);

        // Determine session mood
        const mood = this.determineMood(tasksCompleted.length, errorsResolved.length, messages.length);

        return {
            id: randomUUID(),
            sessionId,
            timestamp: new Date(),
            summary,
            highlights,
            decisions,
            tasksCompleted,
            errorsResolved,
            preferencesLearned,
            mood,
            duration: metadata?.duration,
            messageCount: messages.length,
        };
    }

    private generateSummary(tasks: string[], decisions: string[], errors: string[]): string {
        const parts: string[] = [];

        if (tasks.length > 0) {
            parts.push(`Completed ${tasks.length} task(s): ${tasks.slice(0, 2).join('; ')}`);
        }
        if (decisions.length > 0) {
            parts.push(`Made ${decisions.length} decision(s)`);
        }
        if (errors.length > 0) {
            parts.push(`Resolved ${errors.length} issue(s)`);
        }

        return parts.length > 0 ? parts.join('. ') + '.' : 'Routine session with general discussion.';
    }

    private determineMood(
        taskCount: number,
        errorCount: number,
        messageCount: number
    ): Episode['mood'] {
        if (taskCount > 3) return 'productive';
        if (errorCount > 2) return 'challenging';
        if (messageCount > 20) return 'exploratory';
        return 'routine';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Episodic Memory Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class EpisodicMemory {
    private filePath: string;
    private store: EpisodicStore | null = null;
    private compactor: SessionCompactor;
    private maxEpisodes: number;
    private retentionDays: number;

    constructor(options?: {
        filePath?: string;
        maxEpisodes?: number;
        retentionDays?: number;
    }) {
        this.filePath = options?.filePath ?? './data/memory/episodes.json';
        this.maxEpisodes = options?.maxEpisodes ?? 100;
        this.retentionDays = options?.retentionDays ?? 30;
        this.compactor = new SessionCompactor();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        await this.ensureDirectoryExists();

        if (existsSync(this.filePath)) {
            await this.load();
        } else {
            this.store = this.createEmptyStore();
            await this.save();
        }

        // Run automatic compaction
        await this.compactOldEpisodes();

        logger.info('EpisodicMemory initialized', {
            episodes: this.store?.episodes.length ?? 0,
        });
    }

    private createEmptyStore(): EpisodicStore {
        return {
            version: '1.0.0',
            lastCompaction: new Date().toISOString(),
            episodes: [],
        };
    }

    private async ensureDirectoryExists(): Promise<void> {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Core Operations
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record a session as an episode
     */
    async recordSession(
        sessionId: string,
        messages: Array<{ role: string; content: string; timestamp?: Date }>,
        metadata?: { duration?: number }
    ): Promise<Episode> {
        await this.ensureLoaded();

        const episode = this.compactor.compactSession(sessionId, messages, metadata);
        this.store!.episodes.push(episode);

        // Maintain size limit
        if (this.store!.episodes.length > this.maxEpisodes) {
            this.store!.episodes = this.store!.episodes.slice(-this.maxEpisodes);
        }

        await this.save();
        logger.debug('Recorded session episode', {
            sessionId,
            highlights: episode.highlights.length
        });

        return episode;
    }

    /**
     * Search episodes by query
     */
    async search(query: EpisodeQuery): Promise<Episode[]> {
        await this.ensureLoaded();

        let results = [...this.store!.episodes];

        // Filter by date range
        if (query.dateRange) {
            results = results.filter(ep => {
                const ts = new Date(ep.timestamp);
                return ts >= query.dateRange!.start && ts <= query.dateRange!.end;
            });
        }

        // Filter by highlight types
        if (query.types && query.types.length > 0) {
            results = results.filter(ep =>
                ep.highlights.some(h => query.types!.includes(h.type))
            );
        }

        // Filter by keywords
        if (query.keywords && query.keywords.length > 0) {
            const lowerKeywords = query.keywords.map(k => k.toLowerCase());
            results = results.filter(ep => {
                const text = [
                    ep.summary,
                    ...ep.highlights.map(h => h.content),
                    ...ep.decisions,
                    ...ep.tasksCompleted,
                ].join(' ').toLowerCase();

                return lowerKeywords.some(kw => text.includes(kw));
            });
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        // Apply limit
        if (query.limit) {
            results = results.slice(0, query.limit);
        }

        return results;
    }

    /**
     * Get recent episodes
     */
    async getRecent(count: number = 5): Promise<Episode[]> {
        await this.ensureLoaded();
        return this.store!.episodes
            .slice(-count)
            .reverse();
    }

    /**
     * Get episode context for agent prompt
     */
    async getEpisodicContext(limit: number = 3): Promise<string> {
        const recent = await this.getRecent(limit);

        if (recent.length === 0) {
            return '';
        }

        const lines = ['## Recent Session Highlights'];

        for (const ep of recent) {
            const date = new Date(ep.timestamp).toLocaleDateString();
            lines.push(`\n### ${date} (${ep.mood ?? 'session'})`);
            lines.push(ep.summary);

            if (ep.preferencesLearned.length > 0) {
                lines.push(`Preferences: ${ep.preferencesLearned.slice(0, 2).join('; ')}`);
            }
        }

        return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Compaction & Cleanup
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Remove old episodes beyond retention period
     */
    private async compactOldEpisodes(): Promise<void> {
        if (!this.store) return;

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.retentionDays);

        const before = this.store.episodes.length;
        this.store.episodes = this.store.episodes.filter(ep =>
            new Date(ep.timestamp) >= cutoff
        );
        const after = this.store.episodes.length;

        if (before !== after) {
            this.store.lastCompaction = new Date().toISOString();
            await this.save();
            logger.info('Compacted old episodes', { removed: before - after });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    private async load(): Promise<void> {
        try {
            const content = await readFile(this.filePath, 'utf-8');
            this.store = JSON.parse(content);
        } catch (error) {
            logger.error('Failed to load episodes', { error });
            this.store = this.createEmptyStore();
        }
    }

    private async save(): Promise<void> {
        if (!this.store) return;

        try {
            await writeFile(
                this.filePath,
                JSON.stringify(this.store, null, 2),
                'utf-8'
            );
        } catch (error) {
            logger.error('Failed to save episodes', { error });
        }
    }

    private async ensureLoaded(): Promise<void> {
        if (!this.store) {
            await this.initialize();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────────

    getStats(): {
        totalEpisodes: number;
        oldestEpisode: Date | null;
        moodDistribution: Record<string, number>;
    } {
        if (!this.store || this.store.episodes.length === 0) {
            return { totalEpisodes: 0, oldestEpisode: null, moodDistribution: {} };
        }

        const moods: Record<string, number> = {};
        for (const ep of this.store.episodes) {
            const mood = ep.mood ?? 'unknown';
            moods[mood] = (moods[mood] ?? 0) + 1;
        }

        return {
            totalEpisodes: this.store.episodes.length,
            oldestEpisode: new Date(this.store.episodes[0]?.timestamp ?? Date.now()),
            moodDistribution: moods,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let episodicMemoryInstance: EpisodicMemory | null = null;

export function getEpisodicMemory(options?: {
    filePath?: string;
    maxEpisodes?: number;
    retentionDays?: number;
}): EpisodicMemory {
    if (!episodicMemoryInstance) {
        episodicMemoryInstance = new EpisodicMemory(options);
    }
    return episodicMemoryInstance;
}

export async function initializeEpisodicMemory(options?: {
    filePath?: string;
    maxEpisodes?: number;
    retentionDays?: number;
}): Promise<EpisodicMemory> {
    episodicMemoryInstance = new EpisodicMemory(options);
    await episodicMemoryInstance.initialize();
    return episodicMemoryInstance;
}

export function resetEpisodicMemory(): void {
    episodicMemoryInstance = null;
}
