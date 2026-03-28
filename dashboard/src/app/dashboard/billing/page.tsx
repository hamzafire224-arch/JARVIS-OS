import { createClient } from '@/lib/supabase/server';

export default async function BillingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .single();

    const plan = subscription?.plan || 'balanced';
    const status = subscription?.status || 'free';

    // Calculate free period
    const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const isInFreePeriod = status === 'trial' && daysLeft !== null && daysLeft > 0;

    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric',
        })
        : null;

    const checkoutUrl = `/api/checkout?user_id=${user!.id}&email=${user!.email}`;

    return (
        <>
            <div className="dashboard-header">
                <h1>Billing</h1>
                <p>Manage your subscription and payment details.</p>
            </div>

            <div className="dashboard-content">
                {/* Current Plan */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">Current Plan</h3>
                        <span className={`plan-badge ${plan === 'productivity' ? 'pro' : 'free'}`}>
                            {plan === 'productivity' ? '⚡ Productivity' : 'Balanced'}
                        </span>
                    </div>

                    {isInFreePeriod ? (
                        /* Free Period Active */
                        <div>
                            <div style={{
                                background: 'var(--accent-bg)',
                                border: '1px solid var(--accent-border)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem',
                                marginBottom: '1.5rem',
                            }}>
                                <div style={{ fontWeight: 600, color: 'var(--accent-1)', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                    🎉 Free Productivity Access
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                                    You have <strong style={{ color: 'var(--text-primary)' }}>{daysLeft} days</strong> remaining
                                    of free Productivity access. All features are fully unlocked — no credit card required.
                                </p>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                                    After the free period, Productivity will cost $20/month. You&apos;ll be notified before any changes.
                                    The Balanced plan stays free forever.
                                </p>

                                {/* Progress bar */}
                                <div style={{
                                    marginTop: '1rem',
                                    height: 6,
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 3,
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${Math.max(5, ((60 - daysLeft) / 60) * 100)}%`,
                                        height: '100%',
                                        background: 'var(--accent-gradient)',
                                        borderRadius: 3,
                                    }} />
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginTop: '0.5rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-tertiary)',
                                }}>
                                    <span>Day {60 - daysLeft} of 60</span>
                                    <span>{daysLeft} days left</span>
                                </div>
                            </div>

                            {/* Plan Features */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                                    What&apos;s included:
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-secondary)',
                                }}>
                                    {[
                                        'Cloud AI (Gemini, OpenAI, Claude)',
                                        'Local AI (Ollama)',
                                        'Full 4-layer memory',
                                        'Advanced security + audit',
                                        'All skills & marketplace',
                                        'Priority support',
                                        'MCP integrations',
                                        'Voice interface',
                                    ].map((f) => (
                                        <div key={f}>
                                            <span style={{ color: 'var(--success)' }}>✓</span> {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : plan === 'balanced' ? (
                        /* Balanced Plan */
                        <div>
                            <p className="card-description" style={{ marginBottom: '1.5rem' }}>
                                You&apos;re on the free Balanced plan. Upgrade to Productivity for cloud AI providers,
                                full memory, and advanced features.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.25rem',
                                    background: 'var(--bg-card)',
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Balanced — Free</div>
                                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 2, listStyle: 'none', padding: 0 }}>
                                        <li>✓ Ollama local models</li>
                                        <li>✓ Working + semantic memory</li>
                                        <li>✓ Basic security</li>
                                        <li>✓ Core skills</li>
                                    </ul>
                                </div>
                                <div style={{
                                    border: '2px solid var(--accent-1)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.25rem',
                                    background: 'var(--accent-bg)',
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent-1)' }}>Productivity — $20/mo</div>
                                    <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 2, listStyle: 'none', padding: 0 }}>
                                        <li>✓ Everything in Balanced</li>
                                        <li>✓ Cloud AI providers</li>
                                        <li>✓ Full 4-layer memory</li>
                                        <li>✓ Priority support</li>
                                    </ul>
                                </div>
                            </div>

                            <a href={checkoutUrl}>
                                <button className="btn-primary" style={{ maxWidth: 260 }}>
                                    Upgrade to Productivity — $20/mo
                                </button>
                            </a>
                        </div>
                    ) : (
                        /* Active Paid Subscription */
                        <div>
                            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Status</div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: status === 'active' ? 'var(--success)' : status === 'past_due' ? 'var(--warning)' : 'var(--error)',
                                    }}>
                                        {status === 'active' ? '✓ Active' : status === 'past_due' ? '⚠ Past Due' : '✗ ' + status}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Amount</div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>$20.00 / month</div>
                                </div>
                                {periodEnd && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Next Billing</div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{periodEnd}</div>
                                    </div>
                                )}
                            </div>

                            <a href={`/api/customer-portal?user_id=${user!.id}`}>
                                <button className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.25rem' }}>
                                    Manage Subscription
                                </button>
                            </a>
                        </div>
                    )}
                </div>

                {/* Billing FAQ */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Billing FAQ</h3>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <p><strong style={{ color: 'var(--text-primary)' }}>How does billing work?</strong><br />
                            You are charged monthly on the day you subscribed. You can cancel anytime from the customer portal.</p>
                        <br />
                        <p><strong style={{ color: 'var(--text-primary)' }}>What happens after the free period?</strong><br />
                            Productivity transitions to $20/month. You&apos;ll be notified in advance. If you don&apos;t subscribe, JARVIS
                            gracefully downgrades to Balanced (free forever). 7-day grace period on payment issues.</p>
                        <br />
                        <p><strong style={{ color: 'var(--text-primary)' }}>What payment methods are accepted?</strong><br />
                            Credit/debit cards and PayPal, processed securely through LemonSqueezy.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
