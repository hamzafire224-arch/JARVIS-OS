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
    const periodEnd = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
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
                            {plan === 'productivity' ? 'Productivity' : 'Balanced'}
                        </span>
                    </div>

                    {plan === 'balanced' ? (
                        <div>
                            <p className="card-description" style={{ marginBottom: '1.5rem' }}>
                                You&apos;re on the free Balanced plan. Upgrade to Productivity for cloud AI providers,
                                full memory, and advanced features.
                            </p>

                            {/* Plan Comparison */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                marginBottom: '1.5rem',
                            }}>
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 12,
                                    padding: '1.25rem',
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Balanced — Free</div>
                                    <ul style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 2, listStyle: 'none', padding: 0 }}>
                                        <li>✓ Ollama local models</li>
                                        <li>✓ Working + semantic memory</li>
                                        <li>✓ Basic security</li>
                                        <li>✓ Filesystem + terminal skills</li>
                                        <li>✓ Community support</li>
                                    </ul>
                                </div>
                                <div style={{
                                    border: '2px solid #8b5cf6',
                                    borderRadius: 12,
                                    padding: '1.25rem',
                                    background: 'rgba(139, 92, 246, 0.03)',
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: '#8b5cf6' }}>Productivity — $20/mo</div>
                                    <ul style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 2, listStyle: 'none', padding: 0 }}>
                                        <li>✓ Everything in Balanced</li>
                                        <li>✓ Cloud AI (Gemini, OpenAI, Claude)</li>
                                        <li>✓ Full 4-layer memory</li>
                                        <li>✓ Browser + Database + GitHub skills</li>
                                        <li>✓ Priority support + updates</li>
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
                        <div>
                            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Status</div>
                                    <div style={{
                                        fontWeight: 600,
                                        color: status === 'active' ? '#059669' : status === 'past_due' ? '#d97706' : '#dc2626',
                                    }}>
                                        {status === 'active' ? '✓ Active' : status === 'past_due' ? '⚠ Past Due' : '✗ ' + status}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Amount</div>
                                    <div style={{ fontWeight: 600 }}>$20.00 / month</div>
                                </div>
                                {periodEnd && (
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>Next Billing Date</div>
                                        <div style={{ fontWeight: 600 }}>{periodEnd}</div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <a href={`/api/customer-portal?user_id=${user!.id}`}>
                                    <button className="btn-secondary" style={{ width: 'auto', padding: '0.6rem 1.25rem' }}>
                                        Manage Subscription
                                    </button>
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Billing FAQ */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Billing FAQ</h3>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.8 }}>
                        <p><strong>How does billing work?</strong><br />
                            You are charged monthly on the day you subscribed. You can cancel anytime from the customer portal.</p>
                        <br />
                        <p><strong>What happens if I cancel?</strong><br />
                            You keep Productivity features until the end of your current billing period, then gracefully downgrade to Balanced.</p>
                        <br />
                        <p><strong>What payment methods are accepted?</strong><br />
                            Credit/debit cards and PayPal, processed securely through LemonSqueezy.</p>
                    </div>
                </div>
            </div>
        </>
    );
}
