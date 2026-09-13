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
            {/* Header — Fully Authenticated */}
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* User initials avatar */}
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'rgba(0, 212, 255, 0.1)',
                        border: '1.5px solid rgba(0, 212, 255, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1rem',
                        color: 'var(--accent-1, #00d4ff)',
                    }}>
                        {(() => {
                            const name = user.user_metadata?.full_name || user.email || '';
                            const parts = name.split(/[\s@]+/);
                            return parts.length >= 2
                                ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
                                : name.slice(0, 2).toUpperCase();
                        })()}
                    </div>
                    <div>
                        <h1>Welcome back, <span className="text-gradient">{
                            user.user_metadata?.full_name
                            || user.email?.split('@')[0]
                            || 'User'
                        }</span></h1>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span>Your JARVIS command center</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>•</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>Member since {memberSince}</span>
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
