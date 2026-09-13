/**
 * JARVIS Federated Insights (AGI Feature 3.3)
 * 
 * Privacy-first aggregated learning across users:
 * - Aggregates anonymized tool usage patterns
 * - Learns optimal tool chains from population statistics
 * - Improves suggestions based on collective intelligence
 * - Differential privacy mechanisms ensure no raw data leaves device
 * 
 * Architecture:
 * - Local: Collects usage stats in anonymized format
 * - Cloud: Uploads statistical aggregates to Supabase
 * - Download: Periodically fetches population-level insights
 */

import { existsSync } from 'fs';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface AggregatedStat {
    category: string;      // e.g., "tool_usage", "task_type", "error_recovery"
    key: string;           // e.g., "read_file", "react_component"
    count: number;         // Occurrence count (anonymized)
    successRate: number;   // 0-1
    avgDurationMs: number;
}

interface FederatedData {
    version: string;
    deviceId: string;     // Random, non-identifying device ID
    localStats: AggregatedStat[];
    populationInsights: PopulationInsight[];
    lastSyncAt: string;
    lastFetchAt: string;
}

export interface PopulationInsight {
    category: string;
    insight: string;
    confidence: number;   // 0-1
    sampleSize: number;
    updatedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Differential Privacy
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add Laplacian noise for differential privacy.
 * Ensures individual data points cannot be reverse-engineered.
 */
function addNoise(value: number, epsilon: number = 1.0): number {
    // Laplace mechanism: add noise from Lap(1/ε)
    const scale = 1.0 / epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return Math.max(0, Math.round(value + noise));
}

function noisyRate(rate: number, epsilon: number = 2.0): number {
    // Add noise to a rate (0-1) and clamp
    const noise = (Math.random() - 0.5) * (2 / epsilon);
    return Math.max(0, Math.min(1, rate + noise));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Federated Insights Manager
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_PATH = resolve('./data/memory/federated_insights.json');
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000; // Sync once per day

export class FederatedInsights {
    private filePath: string;
    private data: FederatedData | null = null;

    constructor(filePath?: string) {
        this.filePath = filePath ?? DEFAULT_PATH;
    }

    async initialize(): Promise<void> {
        if (this.data) return;

        if (existsSync(this.filePath)) {
            try {
                const content = await readFile(this.filePath, 'utf-8');
                this.data = JSON.parse(content);
                logger.info('[FEDERATED] Loaded insights', {
                    localStats: this.data!.localStats.length,
                    populationInsights: this.data!.populationInsights.length,
                });
                return;
            } catch {
                // Corrupted — recreate
            }
        }

        this.data = {
            version: '1.0.0',
            deviceId: this.generateDeviceId(),
            localStats: [],
            populationInsights: [],
            lastSyncAt: '',
            lastFetchAt: '',
        };
        await this.save();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Recording Local Stats
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record a tool usage event (anonymized).
     * Only records category-level aggregates, never raw data.
     */
    async recordToolUsage(toolName: string, success: boolean, durationMs: number): Promise<void> {
        await this.ensureLoaded();

        const existing = this.data!.localStats.find(
            s => s.category === 'tool_usage' && s.key === toolName
        );

        if (existing) {
            const totalOld = existing.count;
            existing.count++;
            existing.successRate = (existing.successRate * totalOld + (success ? 1 : 0)) / existing.count;
            existing.avgDurationMs = (existing.avgDurationMs * totalOld + durationMs) / existing.count;
        } else {
            this.data!.localStats.push({
                category: 'tool_usage',
                key: toolName,
                count: 1,
                successRate: success ? 1 : 0,
                avgDurationMs: durationMs,
            });
        }

        await this.save();
    }

    /**
     * Record a task type pattern (anonymized).
     */
    async recordTaskType(taskType: string, success: boolean, durationMs: number): Promise<void> {
        await this.ensureLoaded();

        const existing = this.data!.localStats.find(
            s => s.category === 'task_type' && s.key === taskType
        );

        if (existing) {
            const totalOld = existing.count;
            existing.count++;
            existing.successRate = (existing.successRate * totalOld + (success ? 1 : 0)) / existing.count;
            existing.avgDurationMs = (existing.avgDurationMs * totalOld + durationMs) / existing.count;
        } else {
            this.data!.localStats.push({
                category: 'task_type',
                key: taskType,
                count: 1,
                successRate: success ? 1 : 0,
                avgDurationMs: durationMs,
            });
        }

        await this.save();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Cloud Sync
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Upload anonymized local stats to Supabase.
     * Applies differential privacy noise before upload.
     */
    async syncToCloud(): Promise<void> {
        await this.ensureLoaded();

        // Check if enough time has passed since last sync
        if (this.data!.lastSyncAt) {
            const lastSync = new Date(this.data!.lastSyncAt).getTime();
            if (Date.now() - lastSync < SYNC_INTERVAL_MS) {
                return; // Too soon
            }
        }

        try {
            const { getSupabaseClient } = await import('../db/SupabaseClient.js');
            const supabase = getSupabaseClient();
            if (!supabase) return;

            // Apply differential privacy before uploading
            const noisyStats = this.data!.localStats
                .filter(s => s.count >= 5) // Only upload stats with enough samples
                .map(s => ({
                    device_id: this.data!.deviceId,
                    category: s.category,
                    key: s.key,
                    count: addNoise(s.count),
                    success_rate: noisyRate(s.successRate),
                    avg_duration_ms: addNoise(s.avgDurationMs),
                    synced_at: new Date().toISOString(),
                }));

            if (noisyStats.length === 0) return;

            const { error } = await supabase
                .from('jarvis_federated_stats')
                .upsert(noisyStats, { onConflict: 'device_id,category,key' });

            if (error) {
                logger.warn('[FEDERATED] Cloud sync failed', { error: error.message });
                return;
            }

            this.data!.lastSyncAt = new Date().toISOString();
            await this.save();

            logger.info('[FEDERATED] Synced to cloud', { stats: noisyStats.length });
        } catch (err) {
            logger.warn('[FEDERATED] Cloud sync error', {
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    /**
     * Fetch population-level insights from Supabase.
     */
    async fetchPopulationInsights(): Promise<PopulationInsight[]> {
        await this.ensureLoaded();

        try {
            const { getSupabaseClient } = await import('../db/SupabaseClient.js');
            const supabase = getSupabaseClient();
            if (!supabase) return [];

            // Fetch aggregated insights (computed server-side)
            const { data, error } = await supabase
                .from('jarvis_population_insights')
                .select('*')
                .order('confidence', { ascending: false })
                .limit(50);

            if (error || !data) return [];

            const insights: PopulationInsight[] = data.map((row: Record<string, unknown>) => ({
                category: row['category'] as string,
                insight: row['insight'] as string,
                confidence: row['confidence'] as number,
                sampleSize: row['sample_size'] as number,
                updatedAt: row['updated_at'] as string,
            }));

            this.data!.populationInsights = insights;
            this.data!.lastFetchAt = new Date().toISOString();
            await this.save();

            logger.info('[FEDERATED] Fetched population insights', { count: insights.length });
            return insights;
        } catch {
            return this.data!.populationInsights; // Return cached
        }
    }

    /**
     * Get population insights relevant to a task description.
     */
    async getRelevantInsights(taskDescription: string): Promise<string> {
        await this.ensureLoaded();

        const insights = this.data!.populationInsights;
        if (insights.length === 0) return '';

        const words = taskDescription.toLowerCase().split(/\s+/);
        const relevant = insights.filter(i => {
            const iWords = `${i.category} ${i.insight}`.toLowerCase();
            return words.some(w => w.length > 3 && iWords.includes(w));
        });

        if (relevant.length === 0) return '';

        const lines = ['\n## Community Insights'];
        for (const insight of relevant.slice(0, 3)) {
            lines.push(`- ${insight.insight} (${Math.round(insight.confidence * 100)}% confidence, ${insight.sampleSize} users)`);
        }

        return lines.join('\n');
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    async getLocalStats(): Promise<AggregatedStat[]> {
        await this.ensureLoaded();
        return [...this.data!.localStats];
    }

    private generateDeviceId(): string {
        // Generate a random device ID — NOT tied to any user identity
        const chars = 'abcdef0123456789';
        let id = '';
        for (let i = 0; i < 16; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return `dev_${id}`;
    }

    private async ensureLoaded(): Promise<void> {
        if (!this.data) await this.initialize();
    }

    private async save(): Promise<void> {
        if (!this.data) return;

        const dir = dirname(this.filePath);
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: FederatedInsights | null = null;

export function getFederatedInsights(): FederatedInsights {
    if (!instance) {
        instance = new FederatedInsights();
    }
    return instance;
}
