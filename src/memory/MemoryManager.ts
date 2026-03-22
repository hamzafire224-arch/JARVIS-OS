/**
 * JARVIS Memory Manager
 * 
 * Persistent memory system that:
 * - Stores user preferences, facts, and context
 * - Implements session compaction for token efficiency
 * - Provides semantic retrieval of relevant memories
 */

import { readFile, writeFile, mkdir, rename, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';
import type { MemoryEntry, SessionSummary } from '../agent/types.js';
import { resolveMemoryPath, getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { MemoryCorruptedError } from '../utils/errors.js';
import { getMemoryReranker, type MemoryEntry as RerankerEntry, type ScoredEntry } from './MemoryReranker.js';
import { getEncryptionKey, encryptMemory, decryptMemory } from '../security/MemoryEncryption.js';
import { getVectorStore } from './VectorStore.js';
import { getSupabaseClient } from '../db/SupabaseClient.js';

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

        // Cloud sync: hydrate local memory from Supabase
        const supabase = getSupabaseClient();
        if (supabase) {
            try {
                const { data, error } = await supabase.from('memory_vectors').select('*');
                if (!error && data) {
                    const cloudEntries: MemoryEntry[] = data.map((row: any) => ({
                        id: row.id,
                        content: row.content,
                        type: row.type || 'fact',
                        source: 'cloud',
                        importance: row.importance || 5,
                        tags: row.tags || [],
                        createdAt: new Date(row.updated_at),
                        updatedAt: new Date(row.updated_at),
                    }));
                    
                    // Merge avoiding duplicates
                    const localIds = new Set(this.store!.entries.map(e => e.id));
                    let additions = 0;
                    for (const ce of cloudEntries) {
                        if (!localIds.has(ce.id)) {
                            this.store!.entries.push(ce);
                            additions++;
                        }
                    }
                    if (additions > 0) {
                        this.isDirty = true;
                        await this.save();
                        logger.info(`Hydrated ${additions} memories from Supabase Cloud`);
                    }
                }
            } catch (err) {
                logger.warn('Failed to sync memories from Cloud', { err: String(err) });
            }
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

        // Sync vector to remote store if configured
        getVectorStore().upsertRemoteMemory(newEntry).catch(err => {
            logger.warn('Failed to sync new memory to vector store', { error: String(err) });
        });

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

        // Sync updated vector to remote store if configured
        getVectorStore().upsertRemoteMemory(entry).catch(err => {
            logger.warn('Failed to sync updated memory to vector store', { error: String(err) });
        });

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

        // Cloud sync
        const supabase = getSupabaseClient();
        if (supabase) {
            supabase.from('memory_vectors').delete().eq('id', id).then(({ error }) => {
                if (error) logger.warn('Failed to delete memory from Cloud', { error: error.message });
            });
        }

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
     * Search memories by content 
     * Uses semantic search if embeddings are configured, otherwise falls back to keyword match
     */
    async search(query: string, limit: number = 10): Promise<MemoryEntry[]> {
        await this.ensureLoaded();

        const vectorStore = getVectorStore();
        if (vectorStore.canGenerateEmbeddings()) {
            return vectorStore.semanticSearch(query, this.store!.entries, limit);
        }

        // Fallback: simple keyword search
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
            })
            .slice(0, limit);
    }

    /**
     * Search memories with reranking for improved relevance
     */
    async rerankedSearch(query: string, limit: number = 10): Promise<MemoryEntry[]> {
        await this.ensureLoaded();

        // Stage 1: Get candidates using basic keyword match
        const candidates = await this.search(query);

        if (candidates.length === 0) {
            return [];
        }

        // Stage 2: Rerank for improved relevance
        const reranker = getMemoryReranker();
        const rerankerEntries: RerankerEntry[] = candidates.map(e => ({
            id: e.id,
            type: e.type as RerankerEntry['type'],
            content: e.content,
            tags: e.tags,
            timestamp: e.updatedAt.toISOString(),
        }));

        const reranked = await reranker.rerank(query, rerankerEntries);

        // Map back to original entries by ID
        const entryMap = new Map(candidates.map(e => [e.id, e]));
        return reranked
            .slice(0, limit)
            .map(scored => entryMap.get(scored.id)!)
            .filter(Boolean);
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
            let content = await readFile(this.filePath, 'utf-8');
            
            // Check if decryption is needed (content doesn't start with { indicating JSON)
            const key = getEncryptionKey();
            if (!content.trim().startsWith('{')) {
                if (!key) {
                    throw new Error('Memory is encrypted but JARVIS_MEMORY_KEY is not set');
                }
                content = decryptMemory(content, key);
            }

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

        let content = JSON.stringify(this.store, null, 2);
        
        const key = getEncryptionKey();
        if (key) {
            content = encryptMemory(content, key);
        }

        // Create backup of current file before overwriting
        if (existsSync(this.filePath)) {
            try {
                await copyFile(this.filePath, `${this.filePath}.bak`);
            } catch {
                // Backup failure is non-fatal — continue saving
                logger.debug('Could not create memory backup');
            }
        }

        // Atomic write: write to .tmp, then rename (crash-safe)
        const tmpPath = `${this.filePath}.tmp`;
        await writeFile(tmpPath, content, 'utf-8');
        await rename(tmpPath, this.filePath);

        this.isDirty = false;
        logger.memory('Saved to disk (atomic)');
    }

    /**
     * Export all memories to a portable JSON file
     */
    async export(exportPath: string): Promise<{ entries: number; sessions: number }> {
        await this.ensureLoaded();

        const content = JSON.stringify(this.store, null, 2);
        await writeFile(exportPath, content, 'utf-8');

        const stats = {
            entries: this.store!.entries.length,
            sessions: this.store!.sessions.length,
        };

        logger.memory('Exported memory', { path: exportPath, ...stats });
        return stats;
    }

    /**
     * Import memories from a previously exported JSON file
     * Merges with existing memories (skips duplicates by ID)
     */
    async import(importPath: string): Promise<{ imported: number; skipped: number }> {
        await this.ensureLoaded();

        const content = await readFile(importPath, 'utf-8');
        let data: MemoryStore;

        try {
            data = JSON.parse(content);
        } catch {
            throw new MemoryCorruptedError(importPath, 'Invalid JSON in import file');
        }

        if (!data.entries || !Array.isArray(data.entries)) {
            throw new MemoryCorruptedError(importPath, 'Missing entries array in import file');
        }

        const existingIds = new Set(this.store!.entries.map(e => e.id));
        let imported = 0;
        let skipped = 0;

        for (const rawEntry of data.entries) {
            if (existingIds.has(rawEntry.id)) {
                skipped++;
                continue;
            }

            this.store!.entries.push({
                ...rawEntry,
                createdAt: new Date(rawEntry.createdAt),
                updatedAt: new Date(rawEntry.updatedAt),
            });
            imported++;
        }

        if (imported > 0) {
            this.isDirty = true;
            await this.save();
        }

        logger.memory('Imported memory', { path: importPath, imported, skipped });
        return { imported, skipped };
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
