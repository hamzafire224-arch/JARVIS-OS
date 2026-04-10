import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withCors, corsPreflightResponse } from '@/lib/cors';
import { validateLimiter, getClientIp } from '@/lib/rate-limit';

export async function OPTIONS() {
    return corsPreflightResponse();
}

/**
 * POST /api/telemetry — Push telemetry events from the CLI
 * Body: { license_key: string, events: TelemetryEvent[] }
 */
export async function POST(request: Request) {
    try {
        const ip = getClientIp(request);
        const { success: rateLimitOk } = validateLimiter.check(ip);
        if (!rateLimitOk) {
            return withCors(NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { 'Retry-After': '60' } }
            ));
        }

        const { license_key, events } = await request.json();

        if (!license_key) {
            return withCors(NextResponse.json({ error: 'license_key required' }, { status: 400 }));
        }

        if (!events || !Array.isArray(events) || events.length === 0) {
            return withCors(NextResponse.json({ error: 'events array required' }, { status: 400 }));
        }

        if (events.length > 100) {
            return withCors(NextResponse.json({ error: 'Max 100 events per request' }, { status: 400 }));
        }

        const supabase = createAdminClient();

        // Validate license key and get user_id
        const { data: license } = await supabase
            .from('licenses')
            .select('user_id')
            .eq('license_key', license_key)
            .eq('is_active', true)
            .single();

        if (!license) {
            return withCors(NextResponse.json({ error: 'Invalid license key' }, { status: 401 }));
        }

        // Insert events
        const rows = events.map((event: { event_type: string; metadata?: Record<string, unknown>; created_at?: string }) => ({
            user_id: license.user_id,
            event_type: event.event_type,
            metadata: event.metadata || {},
            created_at: event.created_at || new Date().toISOString(),
        }));

        const { error: insertError } = await supabase
            .from('telemetry_events')
            .insert(rows);

        if (insertError) {
            console.error('[Telemetry] Insert error:', insertError);
            return withCors(NextResponse.json({ error: 'Failed to store events' }, { status: 500 }));
        }

        return withCors(NextResponse.json({
            received: events.length,
            message: 'Telemetry events stored successfully',
        }));
    } catch (err) {
        console.error('[Telemetry] Error:', err);
        return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
    }
}

/**
 * GET /api/telemetry — Get aggregated stats for the dashboard
 * Authenticated via Supabase session (cookie-based)
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Count by event types
        const counts = await Promise.all([
            supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).eq('event_type', 'session_start'),
            supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).eq('event_type', 'task_completed'),
            supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).eq('event_type', 'tool_used'),
            supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                .eq('user_id', user.id).eq('event_type', 'memory_update'),
        ]);

        return NextResponse.json({
            sessions: counts[0].count ?? 0,
            tasks: counts[1].count ?? 0,
            tools: counts[2].count ?? 0,
            memory: counts[3].count ?? 0,
        });
    } catch (err) {
        console.error('[Telemetry] GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
