'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const supabase = createClient();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetError) {
            setError(resetError.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);
    };

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #f8f9fc 0%, #eef0f7 100%)',
                padding: '1rem',
            }}>
                <div className="auth-card" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: '#f0fdf4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        fontSize: '2rem',
                    }}>
                        🔑
                    </div>
                    <h1>Check your email</h1>
                    <p className="subtitle" style={{ marginBottom: '1.5rem' }}>
                        We sent a password reset link to <strong>{email}</strong>.<br />
                        Click the link to set a new password.
                    </p>
                    <Link href="/login">
                        <button className="btn-secondary">Back to Login</button>
                    </Link>
                </div>
            </div>
        );
    }

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
                        </svg>
                    </div>
                    <h1>Reset password</h1>
                    <p className="subtitle">Enter your email and we&apos;ll send you a reset link.</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleReset}>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button className="btn-primary" type="submit" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Send Reset Link'}
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
