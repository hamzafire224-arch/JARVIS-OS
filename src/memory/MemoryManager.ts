/**
 * JARVIS Memory Manager
 * 
 * Persistent memory system that:
 * - Stores user preferences, facts, and context
 * - Implements session compaction for token efficiency
 * - Provides semantic retrieval of relevant memories
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import type { MemoryEntry, SessionSummary } from '../agent/types.js';
import { resolveMemoryPath, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { MemoryCorruptedError } from '../utils/errors.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Memory File Format
// ═══════════════════════════════════════════════════════════════════════════════

interface MemoryStore {
    version: string;
    lastUpdated: string;
    entries: MemoryEntry[];
    sessions: SessionSummary[];
}

const MEMORY_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════════
// Memory Manager
// ═══════════════════════════════════════════════════════════════════════════════

export class MemoryManager {
    private filePath: string;
    private store: MemoryStore | null = null;
    private isDirty: boolean = false;

    constructor(filePath?: string) {
        this.filePath = filePath ?? resolveMemoryPath();
    }

    /**
     * Initialize the memory manager, loading existing memory if present
     */
    async initialize(): Promise<void> {
        await this.ensureDirectoryExists();

        if (existsSync(this.filePath)) {
            await this.load();
        } else {
            this.store = this.createEmptyStore();
            await this.save();
        }

        logger.memory('Initialized', {
            entries: this.store?.entries.length ?? 0,
            sessions: this.store?.sessions.length ?? 0,
        });
    }

    /**
     * Add a new memory entry
     */
    async add(entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<MemoryEntry> {
        await this.ensureLoaded();

        const newEntry: MemoryEntry = {
            ...entry,
            id: randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.store!.entries.push(newEntry);
        this.isDirty = true;

        logger.memory('Added entry', { id: newEntry.id, type: newEntry.type });

        await this.save();
        return newEntry;
    }

    /**
     * Update an existing memory entry
     */
    async update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry | null> {
        await this.ensureLoaded();

        const entry = this.store!.entries.find(e => e.id === id);
        if (!entry) return null;

        Object.assign(entry, updates, { updatedAt: new Date() });
        this.isDirty = true;

        logger.memory('Updated entry', { id });

        await this.save();
        return entry;
    }

    /**
     * Delete a memory entry
     */
    async delete(id: string): Promise<boolean> {
        await this.ensureLoaded();

        const index = this.store!.entries.findIndex(e => e.id === id);
        if (index === -1) return false;

        this.store!.entries.splice(index, 1);
        this.isDirty = true;

        logger.memory('Deleted entry', { id });

        await this.save();
        return true;
    }

    /**
     * Search memories by type
     */
    async getByType(type: MemoryEntry['type']): Promise<MemoryEntry[]> {
        await this.ensureLoaded();
        return this.store!.entries.filter(e => e.type === type);
    }

    /**
     * Search memories by tags
     */
    async getByTags(tags: string[]): Promise<MemoryEntry[]> {
        await this.ensureLoaded();
        return this.store!.entries.filter(e =>
            tags.some(tag => e.tags.includes(tag))
        );
    }

    /**
     * Search memories by content (simple keyword search)
     */
    async search(query: string): Promise<MemoryEntry[]> {
        await this.ensureLoaded();

        const lowerQuery = query.toLowerCase();
        const keywords = lowerQuery.split(/\s+/);

        return this.store!.entries
            .filter(e => {
                const content = e.content.toLowerCase();
                const source = e.source.toLowerCase();
                return keywords.some(kw => content.includes(kw) || source.includes(kw));
            })
            .sort((a, b) => {
                // Sort by importance and recency
                const importanceScore = b.importance - a.importance;
                if (importanceScore !== 0) return importanceScore;
                return b.updatedAt.getTime() - a.updatedAt.getTime();
            });
    }

    /**
     * Get all memories formatted for injection into system prompt
     */
    async getMemoryContext(maxTokens: number = 2000): Promise<string> {
        await this.ensureLoaded();

        // Sort by importance and recency
        const sorted = [...this.store!.entries].sort((a, b) => {
            const importanceScore = b.importance - a.importance;
            if (importanceScore !== 0) return importanceScore;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
        });

        const lines: string[] = [];
        let estimatedTokens = 0;

        // Add entries until we hit token limit
        for (const entry of sorted) {
            const line = this.formatEntry(entry);
            const lineTokens = Math.ceil(line.length / 4);

            if (estimatedTokens + lineTokens > maxTokens) break;

            lines.push(line);
            estimatedTokens += lineTokens;
        }

        return lines.join('\n');
    }

    /**
     * Add a session summary (used by compactor)
     */
    async addSessionSummary(summary: Omit<SessionSummary, 'id' | 'createdAt'>): Promise<void> {
        await this.ensureLoaded();

        this.store!.sessions.push({
            ...summary,
            id: randomUUID(),
            createdAt: new Date(),
        });

        // Keep only last 50 sessions
        if (this.store!.sessions.length > 50) {
            this.store!.sessions = this.store!.sessions.slice(-50);
        }

        this.isDirty = true;
        await this.save();

        logger.memory('Added session summary', { tokensSaved: summary.tokensSaved });
    }

    /**
     * Get recent session summaries
     */
    async getRecentSessions(count: number = 5): Promise<SessionSummary[]> {
        await this.ensureLoaded();
        return this.store!.sessions.slice(-count);
    }

    /**
     * Get statistics about memory usage
     */
    async getStats(): Promise<{
        totalEntries: number;
        byType: Record<string, number>;
        totalSessions: number;
        oldestEntry: Date | null;
        newestEntry: Date | null;
    }> {
        await this.ensureLoaded();

        const byType: Record<string, number> = {};
        for (const entry of this.store!.entries) {
            byType[entry.type] = (byType[entry.type] ?? 0) + 1;
        }

        const dates = this.store!.entries.map(e => e.createdAt);

        return {
            totalEntries: this.store!.entries.length,
            byType,
            totalSessions: this.store!.sessions.length,
            oldestEntry: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null,
            newestEntry: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private Methods
    // ─────────────────────────────────────────────────────────────────────────────

    private async ensureLoaded(): Promise<void> {
        if (!this.store) {
            await this.initialize();
        }
    }

    private async ensureDirectoryExists(): Promise<void> {
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
    }

    private createEmptyStore(): MemoryStore {
        return {
            version: MEMORY_VERSION,
            lastUpdated: new Date().toISOString(),
            entries: [],
            sessions: [],
        };
    }

    private async load(): Promise<void> {
        try {
            const content = await readFile(this.filePath, 'utf-8');
            const data = JSON.parse(content);

            // Convert date strings back to Date objects
            this.store = {
                ...data,
                entries: data.entries.map((e: MemoryEntry & { createdAt: string; updatedAt: string }) => ({
                    ...e,
                    createdAt: new Date(e.createdAt),
                    updatedAt: new Date(e.updatedAt),
                })),
                sessions: data.sessions.map((s: SessionSummary & { createdAt: string }) => ({
                    ...s,
                    createdAt: new Date(s.createdAt),
                })),
            };

            logger.memory('Loaded from disk', { path: this.filePath });
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new MemoryCorruptedError(this.filePath, 'Invalid JSON');
            }
            throw error;
        }
    }

    private async save(): Promise<void> {
        if (!this.store || !this.isDirty) return;

        this.store.lastUpdated = new Date().toISOString();

        const content = JSON.stringify(this.store, null, 2);
        await writeFile(this.filePath, content, 'utf-8');

        this.isDirty = false;
        logger.memory('Saved to disk');
    }

    private formatEntry(entry: MemoryEntry): string {
        const typeEmoji: Record<MemoryEntry['type'], string> = {
            preference: '⭐',
            fact: '📌',
            project: '📁',
            context: '💡',
            feedback: '📝',
        };

        const emoji = typeEmoji[entry.type] ?? '•';
        const tags = entry.tags.length > 0 ? ` [${entry.tags.join(', ')}]` : '';

        return `${emoji} ${entry.content}${tags}`;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Instance
// ═══════════════════════════════════════════════════════════════════════════════

let memoryManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
    if (!memoryManager) {
        memoryManager = new MemoryManager();
    }
    return memoryManager;
}

export async function initializeMemory(): Promise<MemoryManager> {
    const manager = getMemoryManager();
    await manager.initialize();
    return manager;
}
