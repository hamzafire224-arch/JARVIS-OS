import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch events for the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('telemetry_events')
            .select('event_type, created_at')
            .eq('user_id', user.id)
            .gte('created_at', sevenDaysAgo.toISOString());

        if (error) {
            console.error('[Telemetry Daily] Database error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Initialize buckets for 7 days
        const days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            return d.toISOString().split('T')[0];
        });

        const buckets = {
            sessions: Object.fromEntries(days.map(d => [d, 0])),
            tasks: Object.fromEntries(days.map(d => [d, 0])),
            tools: Object.fromEntries(days.map(d => [d, 0])),
            memory: Object.fromEntries(days.map(d => [d, 0])),
        };

        // Aggregate counts
        for (const event of data || []) {
            const dateStr = new Date(event.created_at).toISOString().split('T')[0];
            if (!days.includes(dateStr)) continue;

            if (event.event_type === 'session_start' && buckets.sessions[dateStr] !== undefined) {
                buckets.sessions[dateStr]++;
            } else if (event.event_type === 'task_completed' && buckets.tasks[dateStr] !== undefined) {
                buckets.tasks[dateStr]++;
            } else if (event.event_type === 'tool_used' && buckets.tools[dateStr] !== undefined) {
                buckets.tools[dateStr]++;
            } else if (event.event_type === 'memory_update' && buckets.memory[dateStr] !== undefined) {
                buckets.memory[dateStr]++;
            }
        }

        return NextResponse.json({
            sessions: days.map(d => buckets.sessions[d]),
            tasks: days.map(d => buckets.tasks[d]),
            tools: days.map(d => buckets.tools[d]),
            memory: days.map(d => buckets.memory[d]),
        });

    } catch (err) {
        console.error('[Telemetry Daily] GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
