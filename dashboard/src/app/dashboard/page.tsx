import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

    // Fetch license
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

    return (
        <>
            <div className="dashboard-header">
                <h1>Welcome back, <span className="text-gradient">{user!.user_metadata?.full_name || 'Developer'}</span></h1>
                <p>Here&apos;s your PersonalJARVIS overview.</p>
            </div>

            <div className="dashboard-content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Current Plan</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem', marginTop: '0.5rem' }}>
                            <span className={`plan-badge ${plan === 'productivity' ? 'pro' : 'free'}`}>
                                {plan === 'productivity' ? '⚡ Productivity' : 'Balanced'}
                            </span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Member Since</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>{memberSince}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">License Status</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem', color: license ? '#059669' : '#6b7280' }}>
                            {license ? '✓ Active' : 'Not Generated'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Subscription</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem', color: '#059669' }}>
                            {subscription?.status === 'active' ? '✓ Active' : subscription?.status || 'Free Tier'}
                        </div>
                    </div>
                </div>

                {/* Quick Start */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">🚀 Quick Start</h3>
                    </div>
                    <div style={{ background: '#1e1e2e', borderRadius: 8, padding: '1.25rem', fontFamily: 'monospace', color: '#e8e8f0', fontSize: '0.85rem', lineHeight: 1.8 }}>
                        <div style={{ color: '#6b7280' }}># Install PersonalJARVIS globally</div>
                        <div><span style={{ color: '#a855f7' }}>$</span> npm install -g personaljarvis</div>
                        <br />
                        <div style={{ color: '#6b7280' }}># Run the setup wizard</div>
                        <div><span style={{ color: '#a855f7' }}>$</span> jarvis setup</div>
                        <br />
                        <div style={{ color: '#6b7280' }}># Start JARVIS</div>
                        <div><span style={{ color: '#a855f7' }}>$</span> jarvis</div>
                    </div>
                </div>

                {/* Upgrade CTA for free users */}
                {plan === 'balanced' && (
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04), rgba(168, 85, 247, 0.04))',
                        border: '1px solid rgba(139, 92, 246, 0.15)',
                    }}>
                        <div className="card-header">
                            <h3 className="card-title">⚡ Upgrade to Productivity</h3>
                        </div>
                        <p className="card-description" style={{ marginBottom: '1rem' }}>
                            Unlock cloud AI providers (Gemini, OpenAI, Claude), full 4-layer memory, browser automation,
                            advanced analytics, and priority support for <strong>$20/month</strong>.
                        </p>
                        <a href="/dashboard/billing">
                            <button className="btn-primary" style={{ maxWidth: 220 }}>Upgrade Now →</button>
                        </a>
                    </div>
                )}
            </div>
        </>
    );
}
