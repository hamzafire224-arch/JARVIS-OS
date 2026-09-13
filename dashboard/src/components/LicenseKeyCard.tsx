'use client';

import { useState } from 'react';
import { useToast } from '@/components/ToastNotification';

interface LicenseKeyCardProps {
    licenseKey: string | null;
    variant: string;
    userId: string;
    lastValidated?: string;
}

export function LicenseKeyCard({ licenseKey, variant, userId, lastValidated }: LicenseKeyCardProps) {
    const [key, setKey] = useState(licenseKey);
    const [loading, setLoading] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const { toast } = useToast();

    const generateKey = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/license/issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId }),
            });
            const data = await res.json();
            if (data.license_key) {
                setKey(data.license_key);
                setRevealed(true);
                toast('License key generated successfully!', 'success');
            }
        } catch (err) {
            console.error('Failed to generate license:', err);
            toast('Failed to generate license key.', 'error');
        }
        setLoading(false);
    };

    const copyKey = async () => {
        if (key) {
            await navigator.clipboard.writeText(key);
            toast('License key copied to clipboard!', 'success');
        }
    };

    const maskedKey = key
        ? key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)
        : null;

    return (
        <div className="card card-glass">
            <div className="card-header">
                <h3 className="card-title">🔑 Your License Key</h3>
                <span className={`plan-badge ${variant === 'productivity' ? 'pro' : 'free'}`}>
                    {variant === 'productivity' ? 'Productivity' : 'Balanced'}
                </span>
            </div>

            {key ? (
                <div>
                    <div style={{
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-secondary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '1rem 1.25rem',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}>
                        <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                            {revealed ? key : maskedKey}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button
                                onClick={() => setRevealed(!revealed)}
                                className="btn-ghost"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                                aria-label={revealed ? 'Hide license key' : 'Reveal license key'}
                            >
                                {revealed ? 'Hide' : 'Reveal'}
                            </button>
                            <button
                                onClick={copyKey}
                                className="btn-primary"
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    width: 'auto',
                                }}
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                    {lastValidated && (
                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                            Last validated: {new Date(lastValidated).toLocaleString()}
                        </p>
                    )}
                </div>
            ) : (
                <div>
                    <p className="card-description" style={{ marginBottom: '1rem' }}>
                        You haven&apos;t generated a license key yet. Click below to create one for your account.
                    </p>
                    <button className="btn-primary" onClick={generateKey} disabled={loading} style={{ maxWidth: 220 }}>
                        {loading ? <span className="spinner" /> : 'Generate License Key'}
                    </button>
                </div>
            )}
        </div>
    );
}

