'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            setLoading(false);
            return;
        }

        if (password !== confirm) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
            password,
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
            return;
        }

        router.push('/dashboard');
        router.refresh();
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8f9fc 0%, #eef0f7 100%)',
            padding: '1rem',
        }}>
            <div className="auth-card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            <circle cx="12" cy="16" r="1" />
                        </svg>
                    </div>
                    <h1>Set new password</h1>
                    <p className="subtitle">Choose a strong password for your account.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label htmlFor="password">New Password</label>
                        <input
                            id="password"
                            type="password"
                            className="form-input"
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm">Confirm Password</label>
                        <input
                            id="confirm"
                            type="password"
                            className="form-input"
                            placeholder="Re-enter your password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Update Password'}
                    </button>
                </form>

                <p style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    color: '#6b7280',
                    fontSize: '0.875rem',
                }}>
                    <Link href="/login" style={{ color: '#8b5cf6', fontWeight: 600 }}>
                        ← Back to Sign In
                    </Link>
                </p>
            </div>
        </div>
    );
}
