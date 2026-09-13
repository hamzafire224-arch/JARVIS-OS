import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';

export default async function ActivityPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch real session data from telemetry
    const { data: events, count: totalCount } = await supabase
        .from('telemetry_events')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .in('event_type', ['session_start', 'session_end', 'task_completed'])
        .order('created_at', { ascending: false })
        .limit(50);

    const hasData = (totalCount ?? 0) > 0;

    // Group events into sessions
    const sessions = (events ?? [])
        .filter(e => e.event_type === 'session_start' || e.event_type === 'task_completed')
        .map(event => {
            const meta = (event.metadata || {}) as Record<string, string>;
            const created = new Date(event.created_at);
            const now = new Date();
            const diffMs = now.getTime() - created.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            let timeLabel: string;
            if (diffDays === 0) {
                timeLabel = `Today, ${created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            } else if (diffDays === 1) {
                timeLabel = `Yesterday, ${created.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
            } else {
                timeLabel = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            }

            return {
                id: event.id,
                title: meta.title || event.event_type.replace(/_/g, ' '),
                time: timeLabel,
                timeGroup: diffDays === 0 ? 'Today' : diffDays === 1 ? 'Yesterday' : 'Earlier',
                provider: meta.provider || 'System',
                tags: meta.tags ? (meta.tags as unknown as string).split(',') : [],
                status: 'completed',
            };
        });

    const todaySessions = sessions.filter(s => s.timeGroup === 'Today');
    const yesterdaySessions = sessions.filter(s => s.timeGroup === 'Yesterday');
    const olderSessions = sessions.filter(s => s.timeGroup === 'Earlier');

    const renderSession = (session: typeof sessions[0]) => (
        <div key={session.id} className="timeline-item">
            <div className="timeline-dot completed" />
            <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                        <div className="timeline-title">{session.title}</div>
                        <div className="timeline-meta">
                            {session.time} · {session.provider}
                        </div>
                    </div>
                    <span style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: 4,
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        fontWeight: 600,
                        flexShrink: 0,
                    }}>
                        ✓ Done
                    </span>
                </div>
                {session.tags.length > 0 && (
                    <div className="timeline-tags">
                        {session.tags.map(tag => (
                            <span key={tag} className="timeline-tag">{tag}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            <div className="dashboard-header">
                <h1>Activity</h1>
                <p>Your JARVIS session history and completed tasks.</p>
            </div>

            <div className="dashboard-content">
                {/* Summary Stats */}
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    <div className="stat-card">
                        <div className="stat-icon">📋</div>
                        <div className="stat-label">Total Sessions</div>
                        <div className="stat-value">{sessions.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">⏱️</div>
                        <div className="stat-label">Total Events</div>
                        <div className="stat-value">{totalCount ?? 0}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-label">Today</div>
                        <div className="stat-value">{todaySessions.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-label">This Week</div>
                        <div className="stat-value">{todaySessions.length + yesterdaySessions.length}</div>
                    </div>
                </div>

                {!hasData ? (
                    <div className="card">
                        <EmptyState
                            icon="📋"
                            title="No activity yet"
                            description="Start using PersonalJARVIS to see your session history, task completions, and productivity timeline here."
                            actionLabel="Get Started"
                            actionHref="/dashboard/license"
                        />
                    </div>
                ) : (
                    <>
                        {/* Today */}
                        {todaySessions.length > 0 && (
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <div className="card-header">
                                    <h3 className="card-title">Today</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {todaySessions.length} sessions
                                    </span>
                                </div>
                                <div className="timeline">
                                    {todaySessions.map(renderSession)}
                                </div>
                            </div>
                        )}

                        {/* Yesterday */}
                        {yesterdaySessions.length > 0 && (
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <div className="card-header">
                                    <h3 className="card-title">Yesterday</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {yesterdaySessions.length} sessions
                                    </span>
                                </div>
                                <div className="timeline">
                                    {yesterdaySessions.map(renderSession)}
                                </div>
                            </div>
                        )}

                        {/* Earlier */}
                        {olderSessions.length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Earlier</h3>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                        {olderSessions.length} sessions
                                    </span>
                                </div>
                                <div className="timeline">
                                    {olderSessions.map(renderSession)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
