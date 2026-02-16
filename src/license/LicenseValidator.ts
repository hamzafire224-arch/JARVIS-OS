/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PersonalJARVIS — License Validator
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Makes HTTP requests to the dashboard API to validate license keys.
 * Used by LicenseManager on startup when cache is stale.
 */

export interface LicenseValidationResult {
    valid: boolean;
    variant: 'balanced' | 'productivity';
    status: 'active' | 'past_due' | 'degraded' | 'cancelled' | 'expired' | 'free';
    warning?: string;
    expires?: string;
    grace_until?: string;
    reason?: string;
}

const DEFAULT_API_URL = 'https://app.personaljarvis.dev';

export class LicenseValidator {
    private apiUrl: string;
    private timeout: number;

    constructor(apiUrl?: string, timeoutMs: number = 3000) {
        this.apiUrl = apiUrl || process.env.JARVIS_API_URL || DEFAULT_API_URL;
        this.timeout = timeoutMs;
    }

    /**
     * Validate a license key against the API.
     * Returns null if the request fails (network error, timeout) — caller handles fallback.
     */
    async validate(licenseKey: string): Promise<LicenseValidationResult | null> {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(`${this.apiUrl}/api/license/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_key: licenseKey }),
                signal: controller.signal,
            });

            clearTimeout(timer);

            if (!response.ok) {
                console.warn(`[License] Validation API returned ${response.status}`);
                return null;
            }

            return await response.json() as LicenseValidationResult;
        } catch (err: unknown) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.warn('[License] Validation timed out (using cache)');
            } else {
                console.warn('[License] Validation request failed (using cache):', (err as Error).message);
            }
            return null;
        }
    }
}
