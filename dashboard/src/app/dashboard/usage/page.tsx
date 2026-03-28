export default function UsageAnalyticsPage() {
    // Mock data — connects to real telemetry once CLI reports usage
    const weeklyData = [
        { day: 'Mon', tasks: 12, cost: 0.04 },
        { day: 'Tue', tasks: 18, cost: 0.06 },
        { day: 'Wed', tasks: 8, cost: 0.02 },
        { day: 'Thu', tasks: 24, cost: 0.08 },
        { day: 'Fri', tasks: 15, cost: 0.05 },
        { day: 'Sat', tasks: 6, cost: 0.01 },
        { day: 'Sun', tasks: 10, cost: 0.03 },
    ];

    const maxTasks = Math.max(...weeklyData.map(d => d.tasks));

    const providerBreakdown = [
        { name: 'Ollama (Local)', pct: 65, color: 'var(--accent-1)' },
        { name: 'Gemini', pct: 22, color: 'var(--accent-2)' },
        { name: 'OpenAI', pct: 8, color: 'var(--warning)' },
        { name: 'Claude', pct: 5, color: 'var(--info)' },
    ];

    const topSkills = [
        { name: 'filesystem', uses: 45 },
        { name: 'terminal', uses: 38 },
        { name: 'code-analysis', uses: 22 },
        { name: 'git', uses: 18 },
        { name: 'browser', uses: 12 },
    ];
    const maxSkill = Math.max(...topSkills.map(s => s.uses));

    const memoryStats = [
        { layer: 'Working', items: 24, capacity: 50 },
        { layer: 'Semantic', items: 156, capacity: 500 },
        { layer: 'Episodic', items: 89, capacity: 1000 },
        { layer: 'Vector', items: 312, capacity: 5000 },
    ];

    return (
        <>
            <div className="dashboard-header">
                <h1>Usage Analytics</h1>
                <p>Track your JARVIS activity, costs, and performance metrics.</p>
            </div>

            <div className="dashboard-content">
                {/* Top Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">💬</div>
                        <div className="stat-label">Total Sessions</div>
                        <div className="stat-value">47</div>
                        <div className="stat-change positive">↑ 12% vs last week</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-label">Tasks Completed</div>
                        <div className="stat-value">93</div>
                        <div className="stat-change positive">↑ 8% vs last week</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🧠</div>
                        <div className="stat-label">Memory Items</div>
                        <div className="stat-value">581</div>
                        <div className="stat-change positive">+23 this week</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">💰</div>
                        <div className="stat-label">Cost Saved</div>
                        <div className="stat-value" style={{ color: 'var(--success)' }}>$18.40</div>
                        <div className="stat-change positive">90% via local routing</div>
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Weekly Activity Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Tasks This Week</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Total: {weeklyData.reduce((a, b) => a + b.tasks, 0)}</span>
                        </div>
                        <div className="chart-bar-container">
                            {weeklyData.map((d, i) => (
                                <div key={i} className="chart-bar" style={{ height: `${(d.tasks / maxTasks) * 100}%` }} title={`${d.tasks} tasks`} />
                            ))}
                        </div>
                        <div className="chart-labels">
                            {weeklyData.map((d) => (<span key={d.day}>{d.day}</span>))}
                        </div>
                    </div>

                    {/* Provider Breakdown */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Provider Usage</h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>This week</span>
                        </div>
                        <div>
                            {providerBreakdown.map((p) => (
                                <div className="hbar" key={p.name}>
                                    <div className="hbar-label">{p.name}</div>
                                    <div className="hbar-track">
                                        <div className="hbar-fill" style={{ width: `${p.pct}%`, background: p.color }} />
                                    </div>
                                    <div className="hbar-value">{p.pct}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* Top Skills */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Top Skills Used</h3>
                        </div>
                        {topSkills.map((s, i) => (
                            <div className="hbar" key={s.name}>
                                <div className="hbar-label" style={{ width: 120 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.name}</span>
                                </div>
                                <div className="hbar-track">
                                    <div className="hbar-fill" style={{ width: `${(s.uses / maxSkill) * 100}%` }} />
                                </div>
                                <div className="hbar-value">{s.uses}</div>
                            </div>
                        ))}
                    </div>

                    {/* Memory Usage */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Memory Layers</h3>
                        </div>
                        {memoryStats.map((m) => (
                            <div className="hbar" key={m.layer}>
                                <div className="hbar-label">{m.layer}</div>
                                <div className="hbar-track">
                                    <div className="hbar-fill" style={{ width: `${(m.items / m.capacity) * 100}%` }} />
                                </div>
                                <div className="hbar-value">{m.items}</div>
                            </div>
                        ))}
                        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', textAlign: 'right' }}>
                            581 total items across 4 layers
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
