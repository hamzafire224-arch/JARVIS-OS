import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { validateLimiter, getClientIp } from '@/lib/rate-limit';

export async function OPTIONS() {
    return corsPreflightResponse();
}

export async function POST(request: Request) {
    try {
        // Rate limit: 30 requests per minute per IP
        const ip = getClientIp(request);
        const { success: rateLimitOk } = validateLimiter.check(ip);
        if (!rateLimitOk) {
            return withCors(NextResponse.json(
                { valid: false, reason: 'rate_limited' },
                { status: 429, headers: { 'Retry-After': '60' } }
            ));
        }

        const { license_key } = await request.json();

        if (!license_key) {
            return withCors(NextResponse.json({ valid: false, reason: 'license_key required' }, { status: 400 }));
        }

        const supabase = createAdminClient();

        // Look up license
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*, profiles(*), subscriptions(*)')
            .eq('license_key', license_key)
            .eq('is_active', true)
            .single();

        if (licenseError || !license) {
            return withCors(NextResponse.json({
                valid: false,
                reason: 'invalid_license',
                variant: 'balanced',
            }));
        }

        // Update last validated timestamp
        await supabase
            .from('licenses')
            .update({ last_validated_at: new Date().toISOString() })
            .eq('license_key', license_key);

        // Check subscription status — normalize array vs. object response
        const rawSubs = license.subscriptions;
        const sub = Array.isArray(rawSubs) ? (rawSubs[0] ?? null) : (rawSubs ?? null);
        const plan = sub?.plan || 'balanced';
        const status = sub?.status || 'free';

        // ═══════════════════════════════════════════════════════════════════
        // PAID SUBSCRIBER — Active Productivity subscription ($20/mo)
        // ═══════════════════════════════════════════════════════════════════
        if (plan === 'productivity' && status === 'active') {
            return withCors(NextResponse.json({
                valid: true,
                variant: 'productivity',
                status: 'active',
                expires: sub?.current_period_end,
            }));
        }

        // ═══════════════════════════════════════════════════════════════════
        // EXPLICIT TRIAL (via subscription trial_ends_at)
        // ═══════════════════════════════════════════════════════════════════
        if (status === 'trial') {
            const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
            const now = new Date();

            if (trialEnd && now < trialEnd) {
                const msLeft = trialEnd.getTime() - now.getTime();
                const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

                let warning: string | undefined;
                if (daysLeft <= 3) {
                    warning = `Free Productivity access ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Subscribe to keep all features.`;
                } else if (daysLeft <= 7) {
                    warning = `Free Productivity access ends in ${daysLeft} days. Subscribe at your dashboard.`;
                }

                return withCors(NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'trial',
                    trial_days_left: daysLeft,
                    trial_expired: false,
                    warning,
                    expires: sub.trial_ends_at,
                }));
            }

            // Trial has expired
            return withCors(NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'trial_expired',
                trial_days_left: 0,
                trial_expired: true,
                warning: 'Free Productivity access has ended. Subscribe for $20/mo to restore all features.',
            }));
        }

        // ═══════════════════════════════════════════════════════════════════
        // PAST DUE — Grace period (7 days after billing period ends)
        // ═══════════════════════════════════════════════════════════════════
        if (plan === 'productivity' && status === 'past_due') {
            const periodEnd = new Date(sub.current_period_end);
            const gracePeriod = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();

            if (now < gracePeriod) {
                return withCors(NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'past_due',
                    warning: 'Payment overdue. Update billing to avoid service interruption.',
                    grace_until: gracePeriod.toISOString(),
                }));
            }

            // Grace period expired
            return withCors(NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'degraded',
                warning: 'Subscription expired. Degraded to Balanced plan.',
            }));
        }

        // ═══════════════════════════════════════════════════════════════════
        // CANCELLED — Active until period end
        // ═══════════════════════════════════════════════════════════════════
        if (status === 'cancelled') {
            const periodEnd = new Date(sub.current_period_end);
            if (new Date() < periodEnd) {
                return withCors(NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'cancelled',
                    warning: `Active until ${periodEnd.toLocaleDateString()}. Renew to keep Productivity features.`,
                    expires: sub.current_period_end,
                }));
            }

            return withCors(NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'expired',
                warning: 'Subscription expired. Resubscribe for $20/mo to restore Productivity features.',
            }));
        }

        // ═══════════════════════════════════════════════════════════════════
        // 60-DAY AUTOMATIC TRIAL — The core free-to-paid conversion engine
        //
        // Strategy: Every new license gets 60 days of FREE Productivity.
        // Marketing says "Free Forever". Backend enforces the trial window.
        // After 60 days → downgrade to Balanced unless they pay $20/mo.
        // Warnings start at 14 days left and intensify.
        // ═══════════════════════════════════════════════════════════════════
        const TRIAL_DAYS = 60;
        const licenseCreatedAt = license.created_at ? new Date(license.created_at) : null;
        const now = new Date();

        if (licenseCreatedAt) {
            const msElapsed = now.getTime() - licenseCreatedAt.getTime();
            const daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));
            const daysLeft = Math.max(0, TRIAL_DAYS - daysElapsed);

            if (daysLeft > 0) {
                // Still within 60-day free trial — full Productivity access
                let warning: string | undefined;
                if (daysLeft <= 3) {
                    warning = `Your free Productivity access ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}! Subscribe at your dashboard to keep all features.`;
                } else if (daysLeft <= 7) {
                    warning = `${daysLeft} days left of free Productivity access. Subscribe for $20/mo to continue after trial.`;
                } else if (daysLeft <= 14) {
                    warning = `${daysLeft} days remaining in your free Productivity trial. Upgrade at your dashboard.`;
                }

                return withCors(NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'auto_trial',
                    trial_days_left: daysLeft,
                    trial_total: TRIAL_DAYS,
                    trial_expired: false,
                    warning,
                }));
            }

            // 60-day trial expired — downgrade to Balanced
            return withCors(NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'trial_expired',
                trial_days_left: 0,
                trial_total: TRIAL_DAYS,
                trial_expired: true,
                warning: 'Your 60-day free Productivity trial has ended. Subscribe for $20/mo to restore all features.',
            }));
        }

        // Fallback: No created_at timestamp — default to balanced (free tier)
        return withCors(NextResponse.json({
            valid: true,
            variant: 'balanced',
            status: 'free',
        }));
    } catch (err) {
        console.error('License validation error:', err);
        return withCors(NextResponse.json({ valid: false, reason: 'server_error' }, { status: 500 }));
    }
}
