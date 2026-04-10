'use client';

import Link from 'next/link';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SparklineChart } from '@/components/SparklineChart';
import { EmptyState } from '@/components/EmptyState';

interface DashboardClientProps {
    plan: string;
    memberSince: string;
    hasLicense: boolean;
    hasData: boolean;
    stats: { sessions: number; tasks: number; tools: number; memory: number };
    recentActivity: { title: string; time: string; provider: string }[];
}

export function DashboardClient({ plan, memberSince, hasLicense, hasData, stats, recentActivity }: DashboardClientProps) {
    if (!hasData) {
        // ═══ Empty State — No CLI data yet ═══
        return (
            <>
                {/* Stat Cards — show zeros */}
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    {[
                        { label: 'Sessions', value: 0, icon: '💬' },
                        { label: 'Tasks Done', value: 0, icon: '✅' },
                        { label: 'Tools Used', value: 0, icon: '⚡' },
                        { label: 'Memory Items', value: 0, icon: '🧠' },
                    ].map((s) => (
                        <div key={s.label} className="stat-card card-glass animate-in">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon">{s.icon}</div>
                                <div>
                                    <div className="stat-label">{s.label}</div>
                                    <div className="stat-value" style={{ marginTop: '0.25rem' }}>0</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State Card */}
                <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
                    <EmptyState
                        icon="🚀"
                        title="Install JARVIS to get started"
                        description="Once you install and run PersonalJARVIS on your machine, your activity, analytics, and session history will appear here in real time."
                        actionLabel={hasLicense ? 'View License Key' : 'Generate License Key'}
                        actionHref="/dashboard/license"
                    />
                </div>

                {/* Quick Start — always show */}
                <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '150ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">🚀 Quick Start</h3>
                    </div>
                    <div className="code-block">
                        <div className="comment"># 1. Install PersonalJARVIS globally</div>
                        <div><span className="prompt">$</span> npm install -g personaljarvis</div>
                        <br />
                        <div className="comment"># 2. Run the setup wizard (paste your license key)</div>
                        <div><span className="prompt">$</span> jarvis setup</div>
                        <br />
                        <div className="comment"># 3. Start JARVIS</div>
                        <div><span className="prompt">$</span> jarvis</div>
                    </div>
                </div>

                {/* Quick Actions — always show */}
                <div className="card card-glass fade-in-up" style={{ animationDelay: '250ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Quick Actions</h3>
                    </div>
                    <div className="quick-actions">
                        <Link href="/dashboard/license" className="quick-action">
                            <span className="quick-action-icon">🔑</span>
                            {hasLicense ? 'View License Key' : 'Generate License'}
                        </Link>
                        <Link href="/dashboard/settings" className="quick-action">
                            <span className="quick-action-icon">🎨</span>
                            Change Theme
                        </Link>
                        <Link href="/dashboard/billing" className="quick-action">
                            <span className="quick-action-icon">💳</span>
                            Manage Billing
                        </Link>
                        <Link href="/dashboard/usage" className="quick-action">
                            <span className="quick-action-icon">📊</span>
                            View Analytics
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    // ═══ Real Data View — User has CLI telemetry ═══
    return (
        <>
            {/* ═══ Stat Cards Row ═══ */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-card card-glass animate-in">
                    <div>
                        <div className="stat-label">Sessions</div>
                        <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                            <AnimatedCounter value={stats.sessions} />
                        </div>
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div>
                        <div className="stat-label">Tasks Done</div>
                        <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                            <AnimatedCounter value={stats.tasks} />
                        </div>
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div>
                        <div className="stat-label">Tools Used</div>
                        <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                            <AnimatedCounter value={stats.tools} />
                        </div>
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div>
                        <div className="stat-label">Memory Items</div>
                        <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                            <AnimatedCounter value={stats.memory} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Recent Activity ═══ */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '150ms' }}>
                <div className="card-header">
                    <h3 className="card-title">Recent Activity</h3>
                    <Link href="/dashboard/activity" style={{ fontSize: '0.8rem', color: 'var(--accent-1)' }}>View All →</Link>
                </div>
                {recentActivity.length > 0 ? (
                    <div className="timeline">
                        {recentActivity.map((item, i) => (
                            <div key={i} className="timeline-item">
                                <div className={`timeline-dot ${i < recentActivity.length - 1 ? 'completed' : ''}`} />
                                <div className="timeline-content">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="timeline-title">{item.title}</div>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '0.15rem 0.45rem',
                                            borderRadius: 4,
                                            background: 'var(--accent-bg)',
                                            color: 'var(--accent-1)',
                                            fontWeight: 600,
                                        }}>
                                            {item.provider}
                                        </span>
                                    </div>
                                    <div className="timeline-meta">{item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon="📋"
                        title="No recent activity"
                        description="Start a JARVIS session to see your activity here."
                    />
                )}
            </div>

            {/* ═══ Quick Actions ═══ */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '250ms' }}>
                <div className="card-header">
                    <h3 className="card-title">Quick Actions</h3>
                </div>
                <div className="quick-actions">
                    <Link href="/dashboard/license" className="quick-action">
                        <span className="quick-action-icon">🔑</span>
                        {hasLicense ? 'View License Key' : 'Generate License'}
                    </Link>
                    <Link href="/dashboard/usage" className="quick-action">
                        <span className="quick-action-icon">📊</span>
                        View Analytics
                    </Link>
                    <Link href="/dashboard/settings" className="quick-action">
                        <span className="quick-action-icon">🎨</span>
                        Change Theme
                    </Link>
                    <Link href="/dashboard/billing" className="quick-action">
                        <span className="quick-action-icon">💳</span>
                        Manage Billing
                    </Link>
                </div>
            </div>

            {/* ═══ Quick Start ═══ */}
            <div className="card card-glass fade-in-up" style={{ animationDelay: '350ms' }}>
                <div className="card-header">
                    <h3 className="card-title">🚀 Quick Start</h3>
                </div>
                <div className="code-block">
                    <div className="comment"># Install PersonalJARVIS globally</div>
                    <div><span className="prompt">$</span> npm install -g personaljarvis</div>
                    <br />
                    <div className="comment"># Run the setup wizard</div>
                    <div><span className="prompt">$</span> jarvis setup</div>
                    <br />
                    <div className="comment"># Start JARVIS</div>
                    <div><span className="prompt">$</span> jarvis</div>
                </div>
            </div>
        </>
    );
}
