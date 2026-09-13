/**
 * JARVIS Tool Chain Memory (Tier 3 AGI Upgrade)
 * 
 * Learns optimal tool sequences for recurring task types:
 * - "For React component creation: read_file → write_file → run_command(test) → run_command(build)"
 * - Stored as reusable chain templates
 * - Keyword-based matching to suggest chains for new tasks
 * - Persisted locally + Supabase sync
 * 
 * This is "muscle memory" for JARVIS — instead of reasoning from scratch
 * each time, it recalls proven tool sequences.
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir, rename } from 'fs/promises';
import { dirname, resolve } from 'path';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { getSupabaseClient } from '../db/SupabaseClient.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ToolChainStep {
    toolName: string;
    description: string;         // What this step accomplishes
    typicalArgs?: string[];      // Common arg keys (not values — no PII)
}

export interface ToolChain {
    id: string;
    taskType: string;            // e.g. "react_component", "api_endpoint", "debug_test"
    keywords: string[];          // Keywords for matching
    steps: ToolChainStep[];
    successCount: number;        // How many times this chain succeeded
    failureCount: number;
    avgDurationMs: number;
    createdAt: string;
    lastUsedAt: string;
}

interface ToolChainStore {
    version: string;
    chains: ToolChain[];
}

const DEFAULT_STORE: ToolChainStore = { version: '1.0.0', chains: [] };
const DEFAULT_PATH = resolve('./data/memory/tool_chains.json');

// ═══════════════════════════════════════════════════════════════════════════════
// Tool Chain Memory
// ═══════════════════════════════════════════════════════════════════════════════

export class ToolChainMemory {
    private filePath: string;
    private store: ToolChainStore | null = null;
    private isDirty = false;

    constructor(filePath?: string) {
        this.filePath = filePath ?? DEFAULT_PATH;
    }

    async initialize(): Promise<void> {
        if (this.store) return;

        // Try Supabase first
        const supabase = getSupabaseClient();
        if (supabase) {
            try {
                const { data } = await supabase.from('jarvis_tool_chains').select('*');
                if (data && data.length > 0) {
                    this.store = { version: '1.0.0', chains: data };
                    logger.info('[TOOL-CHAIN] Loaded from Supabase', { chains: data.length });
                    return;
                }
            } catch {
                logger.warn('[TOOL-CHAIN] Supabase fetch failed, using local');
            }
        }

        // Local fallback
        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        if (existsSync(this.filePath)) {
            try {
                const content = await readFile(this.filePath, 'utf-8');
                this.store = JSON.parse(content);
            } catch {
                this.store = { ...DEFAULT_STORE };
            }
        } else {
            this.store = { ...DEFAULT_STORE };
            await this.save();
        }

        logger.info('[TOOL-CHAIN] Initialized locally', { chains: this.store!.chains.length });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Recording Chains
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record a successful tool sequence for future recall.
     * Called after a task completes successfully.
     */
    async recordChain(
        taskType: string,
        keywords: string[],
        steps: ToolChainStep[],
        durationMs: number
    ): Promise<ToolChain> {
        await this.ensureLoaded();

        // Check if a similar chain exists (same task type)
        const existing = this.store!.chains.find(c => c.taskType === taskType);

        if (existing) {
            // Update existing chain
            existing.successCount++;
            existing.avgDurationMs = Math.round(
                (existing.avgDurationMs * (existing.successCount - 1) + durationMs) / existing.successCount
            );
            existing.lastUsedAt = new Date().toISOString();

            // Merge new keywords
            for (const kw of keywords) {
                if (!existing.keywords.includes(kw)) {
                    existing.keywords.push(kw);
                }
            }

            // Update steps if the new chain is more detailed
            if (steps.length > existing.steps.length) {
                existing.steps = steps;
            }

            this.isDirty = true;
            await this.save();
            this.syncToCloud(existing);

            logger.info('[TOOL-CHAIN] Updated existing chain', {
                taskType,
                successCount: existing.successCount,
            });

            return existing;
        }

        // Create new chain
        const chain: ToolChain = {
            id: randomUUID(),
            taskType,
            keywords: [...new Set(keywords)],
            steps,
            successCount: 1,
            failureCount: 0,
            avgDurationMs: durationMs,
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
        };

        this.store!.chains.push(chain);
        this.isDirty = true;
        await this.save();
        this.syncToCloud(chain);

        logger.info('[TOOL-CHAIN] Recorded new chain', { taskType, steps: steps.length });
        return chain;
    }

    /**
     * Record a failure for a chain (to adjust confidence)
     */
    async recordFailure(taskType: string): Promise<void> {
        await this.ensureLoaded();
        const chain = this.store!.chains.find(c => c.taskType === taskType);
        if (chain) {
            chain.failureCount++;
            this.isDirty = true;
            this.save().catch(() => {});
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Suggesting Chains
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Find the best matching tool chain for a task description.
     * Uses keyword overlap scoring with success rate weighting.
     */
    async suggestChain(taskDescription: string): Promise<ToolChain | null> {
        await this.ensureLoaded();

        if (this.store!.chains.length === 0) return null;

        const taskWords = taskDescription.toLowerCase().split(/\s+/);
        let bestChain: ToolChain | null = null;
        let bestScore = 0;

        for (const chain of this.store!.chains) {
            // Keyword overlap score
            let keywordScore = 0;
            for (const kw of chain.keywords) {
                if (taskWords.some(w => w.includes(kw.toLowerCase()) || kw.toLowerCase().includes(w))) {
                    keywordScore++;
                }
            }

            if (keywordScore === 0) continue;

            // Normalize by keyword count
            const overlapRatio = keywordScore / Math.max(chain.keywords.length, 1);

            // Success rate weighting
            const total = chain.successCount + chain.failureCount;
            const successRate = total > 0 ? chain.successCount / total : 0.5;

            // Final score
            const score = overlapRatio * successRate * Math.log2(chain.successCount + 1);

            if (score > bestScore) {
                bestScore = score;
                bestChain = chain;
            }
        }

        // Minimum threshold
        if (bestScore < 0.1) return null;

        logger.info('[TOOL-CHAIN] Suggested chain', {
            taskType: bestChain?.taskType,
            score: bestScore,
            steps: bestChain?.steps.length,
        });

        return bestChain;
    }

    /**
     * Get a human-readable suggestion string for system prompt injection
     */
    async getChainAugmentation(taskDescription: string): Promise<string> {
        const chain = await this.suggestChain(taskDescription);
        if (!chain) return '';

        const successRate = Math.round(
            (chain.successCount / (chain.successCount + chain.failureCount)) * 100
        );

        let augmentation = `\n## Recommended Tool Sequence (${successRate}% success rate)\n`;
        augmentation += `Based on ${chain.successCount} successful executions of "${chain.taskType}":\n`;

        for (let i = 0; i < chain.steps.length; i++) {
            augmentation += `${i + 1}. \`${chain.steps[i]!.toolName}\` — ${chain.steps[i]!.description}\n`;
        }

        augmentation += `\nThis sequence typically completes in ~${Math.round(chain.avgDurationMs / 1000)}s.\n`;
        return augmentation;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Queries
    // ─────────────────────────────────────────────────────────────────────────────

    async getAllChains(): Promise<ToolChain[]> {
        await this.ensureLoaded();
        return this.store!.chains
            .sort((a, b) => b.successCount - a.successCount);
    }

    async getChainsByType(taskType: string): Promise<ToolChain[]> {
        await this.ensureLoaded();
        return this.store!.chains.filter(c => c.taskType === taskType);
    }

    async getTopChains(limit = 10): Promise<ToolChain[]> {
        const all = await this.getAllChains();
        return all.slice(0, limit);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Persistence
    // ─────────────────────────────────────────────────────────────────────────────

    private async ensureLoaded(): Promise<void> {
        if (!this.store) await this.initialize();
    }

    private async save(): Promise<void> {
        if (!this.store || !this.isDirty) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        const content = JSON.stringify(this.store, null, 2);
        const tmpPath = `${this.filePath}.tmp`;
        await writeFile(tmpPath, content, 'utf-8');
        await rename(tmpPath, this.filePath);
        this.isDirty = false;
    }

    private syncToCloud(chain: ToolChain): void {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        supabase.from('jarvis_tool_chains').upsert({
            id: chain.id,
            task_type: chain.taskType,
            keywords: chain.keywords,
            steps: chain.steps,
            success_count: chain.successCount,
            failure_count: chain.failureCount,
            avg_duration_ms: chain.avgDurationMs,
        }).then(({ error }) => {
            if (error) logger.warn('[TOOL-CHAIN] Cloud sync failed', { error: error.message });
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: ToolChainMemory | null = null;

export function getToolChainMemory(): ToolChainMemory {
    if (!instance) {
        instance = new ToolChainMemory();
    }
    return instance;
}

export function resetToolChainMemory(): void {
    instance = null;
}
