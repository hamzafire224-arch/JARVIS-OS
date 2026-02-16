import { createClient } from '@/lib/supabase/server';
import { LicenseKeyCard } from '@/components/LicenseKeyCard';

export default async function LicensePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch license
    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .single();

    // Fetch subscription to know the variant
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('user_id', user!.id)
        .single();

    const plan = subscription?.plan || 'balanced';

    return (
        <>
            <div className="dashboard-header">
                <h1>License Key</h1>
                <p>Your license activates PersonalJARVIS features on your machine.</p>
            </div>

            <div className="dashboard-content">
                {/* License Key Display */}
                <LicenseKeyCard
                    licenseKey={license?.license_key || null}
                    variant={plan}
                    userId={user!.id}
                    lastValidated={license?.last_validated_at}
                />

                {/* Setup Instructions */}
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">How to Activate</h3>
                    </div>
                    <div style={{
                        background: '#1e1e2e',
                        borderRadius: 8,
                        padding: '1.25rem',
                        fontFamily: 'monospace',
                        color: '#e8e8f0',
                        fontSize: '0.85rem',
                        lineHeight: 2,
                    }}>
                        <div style={{ color: '#6b7280' }}># During setup wizard, enter your license key:</div>
                        <div><span style={{ color: '#a855f7' }}>$</span> jarvis setup</div>
                        <div style={{ color: '#22c55e' }}>? Enter your license key: [paste key here]</div>
                        <br />
                        <div style={{ color: '#6b7280' }}># Or set it in your .env file:</div>
                        <div><span style={{ color: '#f59e0b' }}>JARVIS_LICENSE_KEY</span>=your-license-key-here</div>
                    </div>
                </div>

                {/* License Info */}
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <div className="card-header">
                        <h3 className="card-title">License Information</h3>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.8 }}>
                        <p><strong>How does licensing work?</strong><br />
                            Your license key links your CLI installation to your account and plan. It&apos;s validated on startup
                            (cached for 24 hours for offline use).</p>
                        <br />
                        <p><strong>Can I use it on multiple machines?</strong><br />
                            Yes, your license works on unlimited machines tied to your account.</p>
                        <br />
                        <p><strong>What if my subscription lapses?</strong><br />
                            You&apos;ll have a 7-day grace period. After that, Productivity features gracefully degrade to Balanced
                            (which always works for free).</p>
                    </div>
                </div>
            </div>
        </>
    );
}
