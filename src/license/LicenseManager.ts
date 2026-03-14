/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PersonalJARVIS — License Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Manages license validation, caching, and feature gating for the CLI.
 * 
 * Behavior:
 * - On startup, reads cached license from ~/.jarvis/license.json
 * - If cache is fresh (< 24h), uses cached variant immediately
 * - If stale, validates online (3s timeout, non-blocking fallback)
 * - If no license key, defaults to 'balanced' (free tier always works)
 * - Displays warnings for past_due/cancelled/expired statuses
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LicenseValidator, LicenseValidationResult } from './LicenseValidator.js';

export interface CachedLicense {
    license_key: string;
    variant: 'balanced' | 'productivity';
    status: string;
    validated_at: string;      // ISO timestamp
    expires?: string;
    warning?: string;
}

export interface LicenseStatus {
    variant: 'balanced' | 'productivity';
    status: string;
    warning?: string;
    isProductivity: boolean;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class LicenseManager {
    private cacheDir: string;
    private cachePath: string;
    private validator: LicenseValidator;
    private cached: CachedLicense | null = null;

    constructor(apiUrl?: string) {
        this.cacheDir = path.join(os.homedir(), '.jarvis');
        this.cachePath = path.join(this.cacheDir, 'license.json');
        this.validator = new LicenseValidator(apiUrl);
    }

    /**
     * Initialize and validate the license.
     * Called once on CLI startup. Returns the current license status.
     */
    async initialize(): Promise<LicenseStatus> {
        const licenseKey = this.getLicenseKey();

        // No license key → free tier
        if (!licenseKey) {
            return {
                variant: 'balanced',
                status: 'free',
                isProductivity: false,
            };
        }

        // Try cached first
        const cached = this.readCache();
        if (cached && cached.license_key === licenseKey && this.isCacheFresh(cached)) {
            return this.toStatus(cached);
        }

        // Validate online
        const result = await this.validator.validate(licenseKey);

        if (result) {
            // Save fresh validation result
            const newCache: CachedLicense = {
                license_key: licenseKey,
                variant: result.variant,
                status: result.status,
                validated_at: new Date().toISOString(),
                expires: result.expires,
                warning: result.warning,
            };
            this.writeCache(newCache);
            return this.toStatus(newCache);
        }

        // Validation failed (network error/timeout) — use stale cache if available
        if (cached && cached.license_key === licenseKey) {
            return this.toStatus(cached);
        }

        // No cache, no network — default to balanced
        return {
            variant: 'balanced',
            status: 'offline',
            warning: 'Could not validate license. Using free tier.',
            isProductivity: false,
        };
    }

    /**
     * Get the license key from environment or config.
     */
    private getLicenseKey(): string | null {
        // Check env var first
        if (process.env.JARVIS_LICENSE_KEY) {
            return process.env.JARVIS_LICENSE_KEY;
        }

        // Check config file
        try {
            const configPath = path.join(this.cacheDir, 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                return config.license_key || null;
            }
        } catch {
            // Ignore config read errors
        }

        return null;
    }

    /**
     * Read cached license from disk.
     */
    private readCache(): CachedLicense | null {
        try {
            if (fs.existsSync(this.cachePath)) {
                const data = JSON.parse(fs.readFileSync(this.cachePath, 'utf-8'));
                this.cached = data;
                return data;
            }
        } catch {
            // Ignore corrupt cache
        }
        return null;
    }

    /**
     * Write license cache to disk.
     */
    private writeCache(cache: CachedLicense): void {
        try {
            if (!fs.existsSync(this.cacheDir)) {
                fs.mkdirSync(this.cacheDir, { recursive: true });
            }
            fs.writeFileSync(this.cachePath, JSON.stringify(cache, null, 2));
            this.cached = cache;
        } catch (err) {
            console.warn('[License] Failed to write cache:', (err as Error).message);
        }
    }

    /**
     * Check if cached license is within the TTL.
     */
    private isCacheFresh(cache: CachedLicense): boolean {
        const validatedAt = new Date(cache.validated_at).getTime();
        return (Date.now() - validatedAt) < CACHE_TTL_MS;
    }

    /**
     * Convert cached license to status object.
     */
    private toStatus(cache: CachedLicense): LicenseStatus {
        return {
            variant: cache.variant,
            status: cache.status,
            warning: cache.warning,
            isProductivity: cache.variant === 'productivity',
        };
    }

    /**
     * Print license status to console with appropriate formatting.
     */
    static printStatus(status: LicenseStatus): void {
        if (status.warning) {
            const isError = status.status === 'degraded' || status.status === 'expired';
            const color = isError ? '\x1b[31m' : '\x1b[33m'; // red or yellow
            const reset = '\x1b[0m';
            console.log(`${color}⚠ ${status.warning}${reset}`);
        }

        if (status.isProductivity) {
            console.log('\x1b[35m⚡ Productivity\x1b[0m plan active');
        }
    }
}
