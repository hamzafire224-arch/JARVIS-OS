import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

    const { data: license } = await supabase
        .from('licenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

    const plan = subscription?.plan || 'balanced';
    const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    // Calculate trial days
    const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

    // Status
    const getStatusDisplay = () => {
        const status = subscription?.status;
        if (status === 'active') return { text: 'Active', color: 'var(--success)', icon: '✓' };
        if (status === 'trial') return { text: 'Free Trial', color: 'var(--success)', icon: '✓' };
        if (status === 'past_due') return { text: 'Past Due', color: 'var(--warning)', icon: '⚠' };
        if (status === 'cancelled') return { text: 'Cancelled', color: 'var(--error)', icon: '✗' };
        return { text: 'Free Tier', color: 'var(--text-secondary)', icon: '○' };
    };
    const statusDisplay = getStatusDisplay();

    return (
        <>
            {/* Header */}
            <div className="dashboard-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1>Welcome back, <span className="text-gradient">{user.user_metadata?.full_name || 'Developer'}</span></h1>
                    <p>Your JARVIS command center.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--accent-bg)', padding: '0.4rem 0.9rem', borderRadius: 'var(--radius-md)' }}>
                    <div className="pulse-live" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-1)' }}>Online</span>
                </div>
            </div>

            <div className="dashboard-content">
                <DashboardClient
                    plan={plan}
                    memberSince={memberSince}
                    daysLeft={daysLeft}
                    hasLicense={!!license}
                    statusDisplay={statusDisplay}
                />
            </div>
        </>
    );
}
