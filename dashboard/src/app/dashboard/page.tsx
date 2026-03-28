import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single();

    const plan = subscription?.plan || 'balanced';
    const memberSince = new Date(user!.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    // Calculate days remaining for free period
    const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

    // Determine status display
    const getStatusDisplay = () => {
        const status = subscription?.status;
        if (status === 'active') return { text: '✓ Active', color: 'var(--success)' };
        if (status === 'trial') return { text: '✓ Active (Free)', color: 'var(--success)' };
        if (status === 'past_due') return { text: '⚠ Past Due', color: 'var(--warning)' };
        if (status === 'cancelled') return { text: '✗ Cancelled', color: 'var(--error)' };
        return { text: '✓ Free Tier', color: 'var(--text-secondary)' };
    };

    const statusDisplay = getStatusDisplay();

    // Mock usage data for charts (will connect to real data later)
    const weeklyUsage = [35, 52, 28, 64, 45, 71, 38];
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxUsage = Math.max(...weeklyUsage);

    const recentActivity = [
        { title: 'Setup wizard completed', time: 'Just now', type: 'setup' },
        { title: 'License key generated', time: '2 min ago', type: 'license' },
        { title: 'Account created', time: '5 min ago', type: 'account' },
    ];

    return (
        <>
            <div className="dashboard-header">
                <h1>Welcome back, <span className="text-gradient">{user!.user_metadata?.full_name || 'Developer'}</span></h1>
                <p>Here&apos;s your PersonalJARVIS overview.</p>
            </div>

            <div className="dashboard-content">
                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">⚡</div>
                        <div className="stat-label">Current Plan</div>
                        <div style={{ marginTop: '0.5rem' }}>
                            <span className={`plan-badge ${plan === 'productivity' ? 'pro' : 'free'}`}>
                                {plan === 'productivity' ? '⚡ Productivity' : 'Balanced'}
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">📅</div>
                        <div className="stat-label">Member Since</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{memberSince}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🔑</div>
                        <div className="stat-label">License</div>
                        <div className="stat-value" style={{
                            fontSize: '1.25rem',
                            color: license ? 'var(--success)' : 'var(--text-tertiary)',
                        }}>
                            {license ? '✓ Active' : 'Not Generated'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">🟢</div>
                        <div className="stat-label">Status</div>
                        <div className="stat-value" style={{
                            fontSize: '1.25rem',
                            color: statusDisplay.color,
                        }}>
                            {statusDisplay.text}
                        </div>
                    </div>
                </div>

                {/* Free Period Banner */}
                {daysLeft !== null && daysLeft > 0 && plan === 'productivity' && (
                    <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--accent-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                                    🎉 Free Productivity Access
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {daysLeft} days remaining · Full access to all features
                                </div>
                            </div>
                            <div style={{
                                background: 'var(--accent-bg)',
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--accent-1)',
                            }}>
                                {daysLeft} days left
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{
                            marginTop: '0.75rem',
                            height: 4,
                            background: 'var(--bg-tertiary)',
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${Math.max(5, ((60 - daysLeft) / 60) * 100)}%`,
                                height: '100%',
                                background: 'var(--accent-gradient)',
                                borderRadius: 2,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>
                    </div>
                )}

                {/* Two Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    {/* Usage Chart */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Weekly Activity</h3>
                            <Link href="/dashboard/usage" style={{ fontSize: '0.8rem', color: 'var(--accent-1)' }}>View All →</Link>
                        </div>
                        <div className="chart-bar-container">
                            {weeklyUsage.map((val, i) => (
                                <div key={i} className="chart-bar" style={{ height: `${(val / maxUsage) * 100}%` }} />
                            ))}
                        </div>
                        <div className="chart-labels">
                            {weekDays.map((d) => (<span key={d}>{d}</span>))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Recent Activity</h3>
                            <Link href="/dashboard/activity" style={{ fontSize: '0.8rem', color: 'var(--accent-1)' }}>View All →</Link>
                        </div>
                        <div className="timeline">
                            {recentActivity.map((item, i) => (
                                <div key={i} className="timeline-item">
                                    <div className={`timeline-dot ${i === recentActivity.length - 1 ? '' : 'completed'}`} />
                                    <div className="timeline-content">
                                        <div className="timeline-title">{item.title}</div>
                                        <div className="timeline-meta">{item.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">Quick Actions</h3>
                    </div>
                    <div className="quick-actions">
                        <Link href="/dashboard/license" className="quick-action">
                            <span className="quick-action-icon">🔑</span>
                            {license ? 'View License Key' : 'Generate License'}
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

                {/* Quick Start */}
                <div className="card">
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
            </div>
        </>
    );
}
