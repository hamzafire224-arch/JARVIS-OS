import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    // Check if user has any telemetry data
    const { count: telemetryCount } = await supabase
        .from('telemetry_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

    const plan = subscription?.plan || 'balanced';
    const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const hasData = (telemetryCount ?? 0) > 0;

    // If there is telemetry data, fetch aggregated stats
    let stats = { sessions: 0, tasks: 0, tools: 0, memory: 0 };
    let recentActivity: { title: string; time: string; provider: string }[] = [];

    if (hasData) {
        // Count sessions
        const { count: sessionCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'session_start');

        // Count tasks
        const { count: taskCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'task_completed');

        // Count tool uses
        const { count: toolCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'tool_used');

        // Count memory updates
        const { count: memoryCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'memory_update');

        stats = {
            sessions: sessionCount ?? 0,
            tasks: taskCount ?? 0,
            tools: toolCount ?? 0,
            memory: memoryCount ?? 0,
        };

        // Recent activity (last 5 events)
        const { data: recentEvents } = await supabase
            .from('telemetry_events')
            .select('*')
            .eq('user_id', user.id)
            .in('event_type', ['task_completed', 'session_start'])
            .order('created_at', { ascending: false })
            .limit(5);

        recentActivity = (recentEvents ?? []).map(event => ({
            title: (event.metadata as Record<string, string>)?.title || event.event_type.replace('_', ' '),
            time: new Date(event.created_at).toLocaleString(),
            provider: (event.metadata as Record<string, string>)?.provider || 'System',
        }));
    }

    return (
        <>
            {/* Header */}
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1>Welcome back, <span className="text-gradient">{user.user_metadata?.full_name || 'Developer'}</span></h1>
                    <p>Your JARVIS command center.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-bg)', padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)' }}>
                    <span className={`plan-badge ${plan === 'productivity' ? 'pro' : 'free'}`}>
                        {plan === 'productivity' ? '⚡ Productivity' : 'Balanced'}
                    </span>
                </div>
            </div>

            <div className="dashboard-content">
                <DashboardClient
                    plan={plan}
                    memberSince={memberSince}
                    hasLicense={!!license}
                    hasData={hasData}
                    stats={stats}
                    recentActivity={recentActivity}
                />
            </div>
        </>
    );
}
