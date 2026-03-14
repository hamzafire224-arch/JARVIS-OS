/**
 * JARVIS Usage Analytics
 * 
 * Tracks usage patterns to help users understand how they use JARVIS
 * and optimize their workflows. All data is local-first and private.
 * 
 * Features:
 * - Track tool usage, conversations, and sessions
 * - Identify most valuable features
 * - Measure cost savings from tiered inference
 * - Generate usage reports
 */

import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsageEvent {
    id: string;
    type: EventType;
    timestamp: Date;
    data: Record<string, unknown>;
    sessionId?: string;
}

export type EventType =
    | 'session_start'
    | 'session_end'
    | 'message_sent'
    | 'message_received'
    | 'tool_used'
    | 'tool_approved'
    | 'tool_denied'
    | 'skill_installed'
    | 'skill_used'
    | 'local_model_used'
    | 'cloud_model_used'
    | 'memory_saved'
    | 'error_occurred';

export interface DailyStats {
    date: string;
    sessions: number;
    messages: number;
    toolCalls: number;
    localInferences: number;
    cloudInferences: number;
    estimatedSavings: number;
    topTools: Array<{ name: string; count: number }>;
}

export interface WeeklyReport {
    weekStart: string;
    weekEnd: string;
    totalSessions: number;
    totalMessages: number;
    avgSessionLength: number;
    mostUsedTools: Array<{ name: string; count: number }>;
    costSavings: number;
    productivityScore: number;
}

export interface AnalyticsConfig {
    enabled: boolean;
    dataDir: string;
    retentionDays: number;
    anonymizeData: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Usage Analytics Tracker
// ═══════════════════════════════════════════════════════════════════════════════

export class UsageAnalytics {
    private config: AnalyticsConfig;
    private events: UsageEvent[] = [];
    private currentSessionId: string | null = null;
    private sessionStartTime: Date | null = null;
    private isDirty: boolean = false;
    private flushInterval: NodeJS.Timeout | null = null;

    constructor(config?: Partial<AnalyticsConfig>) {
        this.config = {
            enabled: config?.enabled ?? true,
            dataDir: config?.dataDir ?? './data/analytics',
            retentionDays: config?.retentionDays ?? 90,
            anonymizeData: config?.anonymizeData ?? true,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        if (!this.config.enabled) {
            logger.info('Analytics disabled');
            return;
        }

        await fs.mkdir(this.config.dataDir, { recursive: true });
        await this.loadTodayEvents();
        await this.cleanupOldData();

        // Auto-flush every 5 minutes
        this.flushInterval = setInterval(() => this.flush(), 5 * 60 * 1000);

        logger.info('UsageAnalytics initialized', {
            todayEvents: this.events.length,
        });
    }

    async shutdown(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Event Tracking
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Track a usage event
     */
    track(type: EventType, data: Record<string, unknown> = {}): void {
        if (!this.config.enabled) return;

        const event: UsageEvent = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type,
            timestamp: new Date(),
            data: this.config.anonymizeData ? this.anonymize(data) : data,
            sessionId: this.currentSessionId ?? undefined,
        };

        this.events.push(event);
        this.isDirty = true;

        logger.debug('Analytics event tracked', { type });
    }

    /**
     * Start a new session
     */
    startSession(sessionId: string): void {
        this.currentSessionId = sessionId;
        this.sessionStartTime = new Date();
        this.track('session_start', { sessionId });
    }

    /**
     * End the current session
     */
    endSession(): void {
        if (this.currentSessionId && this.sessionStartTime) {
            const duration = Math.floor(
                (Date.now() - this.sessionStartTime.getTime()) / 60000
            );
            this.track('session_end', { duration });
        }
        this.currentSessionId = null;
        this.sessionStartTime = null;
    }

    /**
     * Track tool usage
     */
    trackToolUsage(toolName: string, approved: boolean): void {
        this.track(approved ? 'tool_approved' : 'tool_denied', { toolName });
        this.track('tool_used', { toolName });
    }

    /**
     * Track model usage for cost savings
     */
    trackModelUsage(isLocal: boolean, tokens: number): void {
        this.track(isLocal ? 'local_model_used' : 'cloud_model_used', {
            tokens,
            estimatedCost: isLocal ? 0 : tokens * 0.00001, // Rough estimate
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Reports & Stats
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Get today's statistics
     */
    getTodayStats(): DailyStats {
        const today = new Date().toISOString().split('T')[0]!;
        const todayEvents = this.events.filter(
            e => e.timestamp.toISOString().startsWith(today)
        );

        return this.calculateDailyStats(today, todayEvents);
    }

    /**
     * Get stats for a specific date
     */
    async getStatsForDate(date: string): Promise<DailyStats | null> {
        const filePath = this.getFilePath(date);
        if (!existsSync(filePath)) {
            return null;
        }

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const events: UsageEvent[] = JSON.parse(content);
            return this.calculateDailyStats(date, events);
        } catch (error) {
            logger.error('Failed to load stats for date', { date, error });
            return null;
        }
    }

    /**
     * Generate weekly report
     */
    async getWeeklyReport(): Promise<WeeklyReport> {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 7);

        const allStats: DailyStats[] = [];

        for (let d = new Date(weekStart); d <= now; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]!;
            const stats = await this.getStatsForDate(dateStr);
            if (stats) {
                allStats.push(stats);
            }
        }

        // Aggregate stats
        const totalSessions = allStats.reduce((s, d) => s + d.sessions, 0);
        const totalMessages = allStats.reduce((s, d) => s + d.messages, 0);
        const totalLocal = allStats.reduce((s, d) => s + d.localInferences, 0);
        const totalCloud = allStats.reduce((s, d) => s + d.cloudInferences, 0);
        const costSavings = allStats.reduce((s, d) => s + d.estimatedSavings, 0);

        // Aggregate tool usage
        const toolCounts: Record<string, number> = {};
        for (const stats of allStats) {
            for (const tool of stats.topTools) {
                toolCounts[tool.name] = (toolCounts[tool.name] ?? 0) + tool.count;
            }
        }
        const mostUsedTools = Object.entries(toolCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate productivity score (simple heuristic)
        const avgDailySessions = totalSessions / 7;
        const localRatio = totalLocal / (totalLocal + totalCloud + 1);
        const productivityScore = Math.min(100, Math.round(
            (avgDailySessions * 10) + (localRatio * 30) + (mostUsedTools.length * 5)
        ));

        return {
            weekStart: weekStart.toISOString().split('T')[0]!,
            weekEnd: now.toISOString().split('T')[0]!,
            totalSessions,
            totalMessages,
            avgSessionLength: totalSessions > 0
                ? Math.round(totalMessages / totalSessions)
                : 0,
            mostUsedTools,
            costSavings: Math.round(costSavings * 100) / 100,
            productivityScore,
        };
    }

    /**
     * Get cost savings summary
     */
    getCostSavingsSummary(): {
        today: number;
        thisWeek: number;
        localPercent: number;
    } {
        const todayStats = this.getTodayStats();
        const totalInferences = todayStats.localInferences + todayStats.cloudInferences;
        const localPercent = totalInferences > 0
            ? Math.round((todayStats.localInferences / totalInferences) * 100)
            : 0;

        return {
            today: todayStats.estimatedSavings,
            thisWeek: 0, // Would need to aggregate
            localPercent,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private calculateDailyStats(date: string, events: UsageEvent[]): DailyStats {
        const sessions = events.filter(e => e.type === 'session_start').length;
        const messages = events.filter(
            e => e.type === 'message_sent' || e.type === 'message_received'
        ).length;
        const toolCalls = events.filter(e => e.type === 'tool_used').length;
        const localInferences = events.filter(e => e.type === 'local_model_used').length;
        const cloudInferences = events.filter(e => e.type === 'cloud_model_used').length;

        // Calculate savings (local model = $0, cloud = ~$0.01 per call)
        const estimatedSavings = localInferences * 0.01;

        // Count tool usage
        const toolUsage: Record<string, number> = {};
        for (const event of events.filter(e => e.type === 'tool_used')) {
            const toolName = (event.data.toolName as string) ?? 'unknown';
            toolUsage[toolName] = (toolUsage[toolName] ?? 0) + 1;
        }
        const topTools = Object.entries(toolUsage)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            date,
            sessions,
            messages,
            toolCalls,
            localInferences,
            cloudInferences,
            estimatedSavings,
            topTools,
        };
    }

    private anonymize(data: Record<string, unknown>): Record<string, unknown> {
        // Remove potentially sensitive fields
        const cleaned = { ...data };
        const sensitiveKeys = ['content', 'message', 'input', 'output', 'path', 'url'];

        for (const key of sensitiveKeys) {
            if (key in cleaned) {
                cleaned[key] = '[redacted]';
            }
        }

        return cleaned;
    }

    private getFilePath(date: string): string {
        return join(this.config.dataDir, `events_${date}.json`);
    }

    private async loadTodayEvents(): Promise<void> {
        const today = new Date().toISOString().split('T')[0]!;
        const filePath = this.getFilePath(today);

        if (existsSync(filePath)) {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                this.events = JSON.parse(content, (key, value) =>
                    key === 'timestamp' ? new Date(value) : value
                );
            } catch (error) {
                logger.error('Failed to load today\'s events', { error });
                this.events = [];
            }
        }
    }

    private async flush(): Promise<void> {
        if (!this.isDirty || !this.config.enabled) return;

        const today = new Date().toISOString().split('T')[0]!;
        const filePath = this.getFilePath(today);

        try {
            await fs.writeFile(filePath, JSON.stringify(this.events, null, 2), 'utf-8');
            this.isDirty = false;
        } catch (error) {
            logger.error('Failed to flush analytics', { error });
        }
    }

    private async cleanupOldData(): Promise<void> {
        const files = await fs.readdir(this.config.dataDir);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.config.retentionDays);
        const cutoffStr = cutoff.toISOString().split('T')[0]!;

        for (const file of files) {
            if (file.startsWith('events_') && file < `events_${cutoffStr}`) {
                try {
                    await fs.unlink(join(this.config.dataDir, file));
                    logger.debug('Cleaned up old analytics file', { file });
                } catch (error) {
                    logger.error('Failed to cleanup analytics file', { file, error });
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let analyticsInstance: UsageAnalytics | null = null;

export function getUsageAnalytics(config?: Partial<AnalyticsConfig>): UsageAnalytics {
    if (!analyticsInstance) {
        analyticsInstance = new UsageAnalytics(config);
    }
    return analyticsInstance;
}

export async function initializeUsageAnalytics(
    config?: Partial<AnalyticsConfig>
): Promise<UsageAnalytics> {
    analyticsInstance = new UsageAnalytics(config);
    await analyticsInstance.initialize();
    return analyticsInstance;
}

export function resetUsageAnalytics(): void {
    analyticsInstance = null;
}
