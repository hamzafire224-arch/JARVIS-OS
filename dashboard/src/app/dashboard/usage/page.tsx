import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';

export default async function UsageAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Check if user has any telemetry data
    const { count: telemetryCount } = await supabase
        .from('telemetry_events')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

    const hasData = (telemetryCount ?? 0) > 0;

    // If there IS data, fetch aggregated stats
    let stats = { sessions: 0, tasks: 0, tools: 0, savings: 0 };

    if (hasData) {
        const { count: sessionCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'session_start');

        const { count: taskCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'task_completed');

        const { count: toolCount } = await supabase
            .from('telemetry_events')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('event_type', 'tool_used');

        stats = {
            sessions: sessionCount ?? 0,
            tasks: taskCount ?? 0,
            tools: toolCount ?? 0,
            savings: 0,
        };
    }

    return (
        <>
            <div className="dashboard-header">
                <h1>Usage Analytics</h1>
                <p>Track your PersonalJARVIS usage and productivity insights.</p>
            </div>

            <div className="dashboard-content">
                {/* Summary Stats */}
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon">💬</div>
                        <div className="stat-label">Total Sessions</div>
                        <div className="stat-value">{stats.sessions}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-label">Tasks Completed</div>
                        <div className="stat-value">{stats.tasks}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⚡</div>
                        <div className="stat-label">Tools Executed</div>
                        <div className="stat-value">{stats.tools}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-label">Est. Savings</div>
                        <div className="stat-value">$0</div>
                    </div>
                </div>

                {!hasData ? (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <EmptyState
                            icon="📊"
                            title="No usage data yet"
                            description="Install and run PersonalJARVIS to see your usage analytics, cost savings, and productivity insights here."
                            actionLabel="Get Started"
                            actionHref="/dashboard/license"
                        />
                    </div>
                ) : (
                    <>
                        {/* Analytics cards will be populated here as telemetry flows in */}
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <div className="card-header">
                                <h3 className="card-title">Activity Overview</h3>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>
                                Detailed charts and breakdowns will appear as you accumulate more usage data.
                            </p>
                        </div>
                    </>
                )}

                {/* Info Card */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">How Analytics Work</h3>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <p><strong>What&apos;s tracked?</strong><br />
                            Session count, task completions, tool executions, model requests, and memory growth.
                            All data is tied to your account via your license key.</p>
                        <br />
                        <p><strong>Where is data stored?</strong><br />
                            Analytics are stored securely in your Supabase account. Only you can see your data.
                            JARVIS never shares individual usage metrics.</p>
                        <br />
                        <p><strong>Is this real-time?</strong><br />
                            Data syncs periodically from your local CLI to the cloud. Dashboard reflects the latest sync.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
