export default function ActivityPage() {
    // Mock data — will connect to real session telemetry
    const sessions = [
        {
            id: 1,
            title: 'Refactored auth module to use JWT',
            duration: '12 min',
            time: 'Today, 2:34 PM',
            provider: 'Gemini',
            tasks: 4,
            status: 'completed',
            tags: ['refactor', 'auth', 'security'],
        },
        {
            id: 2,
            title: 'Fixed database migration script',
            duration: '5 min',
            time: 'Today, 1:15 PM',
            provider: 'Ollama',
            tasks: 2,
            status: 'completed',
            tags: ['bugfix', 'database'],
        },
        {
            id: 3,
            title: 'Generated API documentation',
            duration: '8 min',
            time: 'Today, 11:42 AM',
            provider: 'Gemini',
            tasks: 3,
            status: 'completed',
            tags: ['docs', 'api'],
        },
        {
            id: 4,
            title: 'Setup CI/CD pipeline',
            duration: '18 min',
            time: 'Yesterday, 4:20 PM',
            provider: 'Claude',
            tasks: 6,
            status: 'completed',
            tags: ['devops', 'ci-cd'],
        },
        {
            id: 5,
            title: 'Code review on PR #42',
            duration: '7 min',
            time: 'Yesterday, 2:10 PM',
            provider: 'Ollama',
            tasks: 2,
            status: 'completed',
            tags: ['review', 'git'],
        },
        {
            id: 6,
            title: 'Built React dashboard components',
            duration: '25 min',
            time: 'Yesterday, 10:30 AM',
            provider: 'Gemini',
            tasks: 8,
            status: 'completed',
            tags: ['frontend', 'react', 'ui'],
        },
        {
            id: 7,
            title: 'Optimized database queries',
            duration: '10 min',
            time: 'Mar 26, 3:45 PM',
            provider: 'Ollama',
            tasks: 3,
            status: 'completed',
            tags: ['performance', 'database'],
        },
        {
            id: 8,
            title: 'Initial JARVIS setup',
            duration: '3 min',
            time: 'Mar 26, 10:00 AM',
            provider: 'System',
            tasks: 1,
            status: 'completed',
            tags: ['setup'],
        },
    ];

    const todaySessions = sessions.filter(s => s.time.startsWith('Today'));
    const yesterdaySessions = sessions.filter(s => s.time.startsWith('Yesterday'));
    const olderSessions = sessions.filter(s => !s.time.startsWith('Today') && !s.time.startsWith('Yesterday'));

    const renderSession = (session: typeof sessions[0]) => (
        <div key={session.id} className="timeline-item">
            <div className="timeline-dot completed" />
            <div className="timeline-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                        <div className="timeline-title">{session.title}</div>
                        <div className="timeline-meta">
                            {session.time} · {session.duration} · {session.tasks} tasks · {session.provider}
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
                <div className="timeline-tags">
                    {session.tags.map(tag => (
                        <span key={tag} className="timeline-tag">{tag}</span>
                    ))}
                </div>
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
                        <div className="stat-label">Total Time</div>
                        <div className="stat-value">1h 28m</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-label">Tasks Done</div>
                        <div className="stat-value">{sessions.reduce((a, s) => a + s.tasks, 0)}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🏆</div>
                        <div className="stat-label">Streak</div>
                        <div className="stat-value">3 days</div>
                    </div>
                </div>

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

                {/* Older */}
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
            </div>
        </>
    );
}
