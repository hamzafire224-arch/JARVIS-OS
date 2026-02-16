import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { license_key } = await request.json();

        if (!license_key) {
            return NextResponse.json({ valid: false, reason: 'license_key required' }, { status: 400 });
        }

        const supabase = await createClient();

        // Look up license
        const { data: license, error: licenseError } = await supabase
            .from('licenses')
            .select('*, profiles(*), subscriptions(*)')
            .eq('license_key', license_key)
            .eq('is_active', true)
            .single();

        if (licenseError || !license) {
            return NextResponse.json({
                valid: false,
                reason: 'invalid_license',
                variant: 'balanced',
            });
        }

        // Update last validated timestamp
        await supabase
            .from('licenses')
            .update({ last_validated_at: new Date().toISOString() })
            .eq('license_key', license_key);

        // Check subscription status
        const sub = license.subscriptions?.[0] || license.subscriptions;
        const plan = sub?.plan || 'balanced';
        const status = sub?.status || 'free';

        // Determine variant based on subscription
        if (plan === 'productivity' && status === 'active') {
            return NextResponse.json({
                valid: true,
                variant: 'productivity',
                status: 'active',
                expires: sub?.current_period_end,
            });
        }

        if (plan === 'productivity' && status === 'past_due') {
            // Allow grace period (7 days from period end)
            const periodEnd = new Date(sub.current_period_end);
            const gracePeriod = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();

            if (now < gracePeriod) {
                return NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'past_due',
                    warning: 'Payment overdue. Update billing to avoid service interruption.',
                    grace_until: gracePeriod.toISOString(),
                });
            }

            // Grace period expired
            return NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'degraded',
                warning: 'Subscription expired. Degraded to Balanced plan.',
            });
        }

        if (status === 'cancelled') {
            const periodEnd = new Date(sub.current_period_end);
            if (new Date() < periodEnd) {
                return NextResponse.json({
                    valid: true,
                    variant: 'productivity',
                    status: 'cancelled',
                    warning: `Active until ${periodEnd.toLocaleDateString()}. Renew to keep Productivity features.`,
                    expires: sub.current_period_end,
                });
            }

            return NextResponse.json({
                valid: true,
                variant: 'balanced',
                status: 'expired',
                warning: 'Subscription expired. Resubscribe for Productivity features.',
            });
        }

        // Default: balanced (free tier)
        return NextResponse.json({
            valid: true,
            variant: 'balanced',
            status: 'free',
        });
    } catch (err) {
        console.error('License validation error:', err);
        return NextResponse.json({ valid: false, reason: 'server_error' }, { status: 500 });
    }
}
