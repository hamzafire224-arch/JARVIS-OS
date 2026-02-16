import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Fetch subscription status (most recent, any status)
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    const plan = subscription?.plan || 'balanced';
    const status = subscription?.status || 'free';

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar
                user={{
                    email: user.email || '',
                    fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                    plan,
                }}
            />
            <main className="dashboard-main">
                {status === 'past_due' && (
                    <div style={{
                        background: '#fef3c7',
                        border: '1px solid #fcd34d',
                        color: '#92400e',
                        padding: '0.75rem 2rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                    }}>
                        ⚠️ Your payment is overdue. Please update your payment method to avoid service interruption.
                        <a href="/dashboard/billing" style={{ fontWeight: 600, marginLeft: 'auto' }}>Update Billing →</a>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
