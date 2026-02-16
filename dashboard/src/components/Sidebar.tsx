'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface SidebarProps {
    user: {
        email: string;
        fullName: string;
        plan: string;
    };
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const links = [
        {
            href: '/dashboard',
            label: 'Overview',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
            ),
        },
        {
            href: '/dashboard/billing',
            label: 'Billing',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                </svg>
            ),
        },
        {
            href: '/dashboard/license',
            label: 'License Key',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
            ),
        },
        {
            href: '/dashboard/settings',
            label: 'Settings',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
            ),
        },
    ];

    const initials = user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <aside className="sidebar">
            {/* Brand */}
            <Link href="/dashboard" className="sidebar-brand">
                <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>
                <span>PersonalJARVIS</span>
            </Link>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
                    >
                        {link.icon}
                        {link.label}
                    </Link>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initials}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{user.fullName}</div>
                        <div className="sidebar-user-plan">
                            <span className={`plan-badge ${user.plan === 'productivity' ? 'pro' : 'free'}`}>
                                {user.plan === 'productivity' ? 'Productivity' : 'Balanced'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    style={{
                        marginTop: '0.75rem',
                        width: '100%',
                        padding: '0.5rem',
                        background: 'transparent',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        color: '#6b7280',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                    }}
                >
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
