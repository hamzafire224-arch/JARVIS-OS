'use client';

import Link from 'next/link';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { SparklineChart } from '@/components/SparklineChart';
import { DonutChart } from '@/components/DonutChart';
import { RadialProgress } from '@/components/RadialProgress';
import { HeatmapGrid } from '@/components/HeatmapGrid';

interface DashboardClientProps {
    plan: string;
    memberSince: string;
    daysLeft: number | null;
    hasLicense: boolean;
    statusDisplay: { text: string; color: string; icon: string };
}

// Simulated data — connects to real telemetry once CLI reports usage
const weeklyTasks = [12, 18, 8, 24, 15, 21, 14];
const weeklySessionsData = [3, 5, 2, 7, 4, 6, 4];
const weeklyToolsData = [15, 22, 10, 35, 20, 28, 18];
const weeklyMemoryData = [520, 535, 540, 548, 555, 568, 581];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const providerBreakdown = [
    { label: 'Ollama (Local)', value: 65, color: 'var(--accent-1)' },
    { label: 'Gemini', value: 22, color: 'var(--accent-2)' },
    { label: 'OpenAI', value: 8, color: 'var(--warning)' },
    { label: 'Claude', value: 5, color: 'var(--info)' },
];

// Heatmap data: 7 rows (days) × 13 cols (weeks)
const heatmapData: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 13 }, () => Math.floor(Math.random() * 5))
);

const recentActivity = [
    { title: 'Refactored auth module', time: '2 min ago', type: 'code', provider: 'Gemini' },
    { title: 'Generated API docs', time: '18 min ago', type: 'docs', provider: 'Ollama' },
    { title: 'Fixed migration script', time: '1 hour ago', type: 'fix', provider: 'Claude' },
    { title: 'Setup CI/CD pipeline', time: '3 hours ago', type: 'devops', provider: 'Gemini' },
];

export function DashboardClient({ plan, memberSince, daysLeft, hasLicense, statusDisplay }: DashboardClientProps) {
    const maxTaskVal = Math.max(...weeklyTasks);

    return (
        <>
            {/* ═══ Stat Cards Row ═══ */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                <div className="stat-card card-glass animate-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Sessions</div>
                            <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                                <AnimatedCounter value={31} />
                            </div>
                            <div className="stat-change positive">↑ 12% vs last week</div>
                        </div>
                        <SparklineChart data={weeklySessionsData} width={80} height={32} showDots />
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Tasks Done</div>
                            <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                                <AnimatedCounter value={112} />
                            </div>
                            <div className="stat-change positive">↑ 8% vs last week</div>
                        </div>
                        <SparklineChart data={weeklyTasks} width={80} height={32} showDots />
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Tools Used</div>
                            <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                                <AnimatedCounter value={148} />
                            </div>
                            <div className="stat-change positive">filesystem, terminal, git</div>
                        </div>
                        <SparklineChart data={weeklyToolsData} width={80} height={32} color="var(--accent-2)" showDots />
                    </div>
                </div>

                <div className="stat-card card-glass animate-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div className="stat-label">Memory Items</div>
                            <div className="stat-value" style={{ marginTop: '0.25rem' }}>
                                <AnimatedCounter value={581} />
                            </div>
                            <div className="stat-change positive">+23 this week</div>
                        </div>
                        <SparklineChart data={weeklyMemoryData} width={80} height={32} color="var(--info)" showDots />
                    </div>
                </div>

                {/* Trial Radial / Plan Card */}
                <div className="stat-card card-gradient-border animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                    {daysLeft !== null && daysLeft > 0 ? (
                        <RadialProgress
                            value={60 - daysLeft}
                            max={60}
                            size={64}
                            label={`${daysLeft} days`}
                            sublabel="trial remaining"
                        />
                    ) : (
                        <div style={{ textAlign: 'center' }}>
                            <div className="stat-label">Plan</div>
                            <div style={{ marginTop: '0.375rem' }}>
                                <span className={`plan-badge ${plan === 'productivity' ? 'pro' : 'free'}`}>
                                    {plan === 'productivity' ? '⚡ Productivity' : 'Balanced'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: statusDisplay.color, marginTop: '0.25rem', fontWeight: 600 }}>
                                {statusDisplay.icon} {statusDisplay.text}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ Charts Row ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Weekly Activity — Tall Gradient Bars */}
                <div className="card card-glass fade-in-up" style={{ animationDelay: '150ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Weekly Activity</h3>
                        <Link href="/dashboard/usage" style={{ fontSize: '0.8rem', color: 'var(--accent-1)' }}>View All →</Link>
                    </div>
                    <div className="chart-bar-container" style={{ height: 180, gap: 8, padding: '0.5rem 0' }}>
                        {weeklyTasks.map((val, i) => (
                            <div
                                key={i}
                                className="chart-bar-v2"
                                style={{ height: `${(val / maxTaskVal) * 100}%` }}
                            >
                                <span className="bar-tooltip">{val} tasks</span>
                            </div>
                        ))}
                    </div>
                    <div className="chart-labels">
                        {weekDays.map((d) => (<span key={d}>{d}</span>))}
                    </div>
                </div>

                {/* Provider Distribution — Donut */}
                <div className="card card-glass fade-in-up" style={{ animationDelay: '250ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Provider Distribution</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>This week</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', position: 'relative' }}>
                        <DonutChart
                            segments={providerBreakdown}
                            size={140}
                            centerValue="100"
                            centerLabel="requests"
                        />
                    </div>
                </div>
            </div>

            {/* ═══ Heatmap + Activity Feed ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Activity Heatmap */}
                <div className="card card-glass fade-in-up" style={{ animationDelay: '350ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Activity Heatmap</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Last 13 weeks</span>
                    </div>
                    <HeatmapGrid data={heatmapData} />
                </div>

                {/* Live Activity Feed */}
                <div className="card card-glass fade-in-up" style={{ animationDelay: '450ms' }}>
                    <div className="card-header">
                        <h3 className="card-title">Recent Activity</h3>
                        <Link href="/dashboard/activity" style={{ fontSize: '0.8rem', color: 'var(--accent-1)' }}>View All →</Link>
                    </div>
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
                </div>
            </div>

            {/* ═══ Quick Actions ═══ */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '550ms' }}>
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
            <div className="card card-glass fade-in-up" style={{ animationDelay: '650ms' }}>
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
