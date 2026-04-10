/**
 * JARVIS Telemetry Sync Service
 * 
 * Background service in the CLI that:
 * 1. Buffers telemetry events locally
 * 2. Batch-syncs them to the dashboard API every 60s
 * 3. Handles offline mode gracefully
 * 4. Respects a telemetryEnabled config flag
 */

import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelemetryEvent {
    event_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
    synced?: boolean;
}

export interface TelemetrySyncConfig {
    licenseKey: string;
    apiUrl: string;
    syncIntervalMs?: number;
    maxBufferSize?: number;
    enabled?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TelemetrySyncService
// ═══════════════════════════════════════════════════════════════════════════════

export class TelemetrySyncService {
    private buffer: TelemetryEvent[] = [];
    private syncIntervalMs: number;
    private maxBufferSize: number;
    private licenseKey: string;
    private apiUrl: string;
    private enabled: boolean;
    private timer: ReturnType<typeof setInterval> | null = null;
    private syncing = false;
    private totalSynced = 0;
    private totalFailed = 0;

    constructor(config: TelemetrySyncConfig) {
        this.licenseKey = config.licenseKey;
        this.apiUrl = config.apiUrl;
        this.syncIntervalMs = config.syncIntervalMs ?? 60_000;
        this.maxBufferSize = config.maxBufferSize ?? 500;
        this.enabled = config.enabled ?? true;
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Track an event. Buffered locally, synced periodically.
     */
    trackEvent(type: string, metadata?: Record<string, unknown>): void {
        if (!this.enabled) return;

        const event: TelemetryEvent = {
            event_type: type,
            metadata: metadata ?? {},
            created_at: new Date().toISOString(),
        };

        this.buffer.push(event);

        // Prevent unbounded memory growth
        if (this.buffer.length > this.maxBufferSize) {
            this.buffer = this.buffer.slice(-this.maxBufferSize);
            logger.debug('[Telemetry] Buffer trimmed to max size');
        }

        logger.debug(`[Telemetry] Event buffered: ${type}`, { bufferSize: this.buffer.length });
    }

    /**
     * Start the periodic sync timer.
     */
    start(): void {
        if (!this.enabled || !this.licenseKey) {
            logger.debug('[Telemetry] Disabled or no license key — sync not started');
            return;
        }

        if (this.timer) return;

        this.timer = setInterval(() => {
            this.flush().catch((err) => {
                logger.debug(`[Telemetry] Periodic flush failed: ${err}`);
            });
        }, this.syncIntervalMs);

        // Don't prevent Node from exiting
        if (this.timer.unref) {
            this.timer.unref();
        }

        logger.debug(`[Telemetry] Sync started (every ${this.syncIntervalMs / 1000}s)`);
    }

    /**
     * Stop the sync timer and flush remaining events.
     */
    async stop(): Promise<void> {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        // Final flush
        if (this.buffer.length > 0) {
            await this.flush();
        }

        logger.debug(`[Telemetry] Stopped. Synced: ${this.totalSynced}, Failed: ${this.totalFailed}`);
    }

    /**
     * Flush all buffered events to the API.
     */
    async flush(): Promise<void> {
        if (this.syncing || this.buffer.length === 0 || !this.licenseKey) return;

        this.syncing = true;
        const batch = [...this.buffer];
        this.buffer = [];

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    license_key: this.licenseKey,
                    events: batch.map(({ event_type, metadata, created_at }) => ({
                        event_type,
                        metadata,
                        created_at,
                    })),
                }),
            });

            if (response.ok) {
                this.totalSynced += batch.length;
                logger.debug(`[Telemetry] Synced ${batch.length} events`);
            } else if (response.status === 429) {
                // Rate limited — put events back
                this.buffer.unshift(...batch);
                logger.debug('[Telemetry] Rate limited, will retry');
            } else {
                // Server error — put events back
                this.buffer.unshift(...batch);
                this.totalFailed += batch.length;
                logger.debug(`[Telemetry] Sync failed: HTTP ${response.status}`);
            }
        } catch {
            // Network error (offline) — put events back
            this.buffer.unshift(...batch);
            logger.debug('[Telemetry] Sync failed: network error (offline?)');
        } finally {
            this.syncing = false;
        }
    }

    /**
     * Get current sync stats.
     */
    getStats(): { buffered: number; synced: number; failed: number; enabled: boolean } {
        return {
            buffered: this.buffer.length,
            synced: this.totalSynced,
            failed: this.totalFailed,
            enabled: this.enabled,
        };
    }

    /**
     * Enable/disable telemetry at runtime.
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        if (!enabled) {
            this.buffer = [];
            if (this.timer) {
                clearInterval(this.timer);
                this.timer = null;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: TelemetrySyncService | null = null;

export function initTelemetrySync(config: TelemetrySyncConfig): TelemetrySyncService {
    instance = new TelemetrySyncService(config);
    return instance;
}

export function getTelemetrySync(): TelemetrySyncService | null {
    return instance;
}
