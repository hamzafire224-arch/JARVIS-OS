'use client';

import { useState } from 'react';

interface LicenseKeyCardProps {
    licenseKey: string | null;
    variant: string;
    userId: string;
    lastValidated?: string;
}

export function LicenseKeyCard({ licenseKey, variant, userId, lastValidated }: LicenseKeyCardProps) {
    const [key, setKey] = useState(licenseKey);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [revealed, setRevealed] = useState(false);

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
            }
        } catch (err) {
            console.error('Failed to generate license:', err);
        }
        setLoading(false);
    };

    const copyKey = async () => {
        if (key) {
            await navigator.clipboard.writeText(key);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const maskedKey = key
        ? key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)
        : null;

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">🔑 Your License Key</h3>
                <span className={`plan-badge ${variant === 'productivity' ? 'pro' : 'free'}`}>
                    {variant === 'productivity' ? 'Productivity' : 'Balanced'}
                </span>
            </div>

            {key ? (
                <div>
                    <div style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        padding: '1rem 1.25rem',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}>
                        <span style={{ color: '#374151', wordBreak: 'break-all' }}>
                            {revealed ? key : maskedKey}
                        </span>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                            <button
                                onClick={() => setRevealed(!revealed)}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: 'white',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                }}
                            >
                                {revealed ? 'Hide' : 'Reveal'}
                            </button>
                            <button
                                onClick={copyKey}
                                style={{
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.75rem',
                                    background: copied ? '#059669' : 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                }}
                            >
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    {lastValidated && (
                        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#9ca3af' }}>
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
