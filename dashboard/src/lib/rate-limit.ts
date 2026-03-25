/**
 * Simple in-memory rate limiter using sliding window.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });
 *
 *   // In your API route:
 *   const { success, remaining } = limiter.check(ip);
 *   if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

interface RateLimiterConfig {
    /** Window duration in milliseconds */
    windowMs: number;
    /** Maximum requests per window */
    max: number;
}

interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetAt: number;
}

export function createRateLimiter(config: RateLimiterConfig) {
    const store = new Map<string, RateLimitEntry>();

    // Periodic cleanup to prevent memory leaks (every 5 minutes)
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (now > entry.resetAt) {
                store.delete(key);
            }
        }
    }, 5 * 60_000);

    // Allow GC if the module is unloaded
    if (cleanupInterval.unref) {
        cleanupInterval.unref();
    }

    return {
        check(key: string): RateLimitResult {
            const now = Date.now();
            const entry = store.get(key);

            // New window or expired window
            if (!entry || now > entry.resetAt) {
                store.set(key, { count: 1, resetAt: now + config.windowMs });
                return { success: true, remaining: config.max - 1, resetAt: now + config.windowMs };
            }

            // Within window
            entry.count++;

            if (entry.count > config.max) {
                return { success: false, remaining: 0, resetAt: entry.resetAt };
            }

            return { success: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
        },
    };
}

/**
 * Extract client IP from a Request (works in Vercel, Cloudflare, and local dev).
 */
export function getClientIp(request: Request): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
        request.headers.get('x-real-ip') ??
        request.headers.get('cf-connecting-ip') ??
        'unknown'
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-configured limiters for different API routes
// ═══════════════════════════════════════════════════════════════════════════════

/** License validation: 30 req/min per IP */
export const validateLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

/** License issuance: 5 req/min per IP */
export const issueLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/** Checkout: 10 req/min per IP */
export const checkoutLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
