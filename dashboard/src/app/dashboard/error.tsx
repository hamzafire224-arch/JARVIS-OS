'use client';

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '2rem',
        }}>
            <div className="card card-glass" style={{
                maxWidth: 480,
                width: '100%',
                textAlign: 'center',
                padding: '2.5rem',
            }}>
                {/* JARVIS Logo */}
                <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </div>

                <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '0.5rem',
                }}>
                    Something went wrong
                </h2>

                <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                    lineHeight: 1.6,
                }}>
                    We encountered an unexpected error while loading this page.
                </p>

                {error.digest && (
                    <p style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        background: 'var(--bg-tertiary)',
                        padding: '0.4rem 0.75rem',
                        borderRadius: 6,
                        marginBottom: '1.25rem',
                        display: 'inline-block',
                    }}>
                        Error ID: {error.digest}
                    </p>
                )}

                {process.env.NODE_ENV === 'development' && error.message && (
                    <div style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '0.8rem',
                        color: 'var(--error)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 8,
                        wordBreak: 'break-all',
                        marginBottom: '1.25rem',
                        textAlign: 'left',
                    }}>
                        {error.message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        onClick={reset}
                        className="btn-primary"
                        style={{ maxWidth: 160 }}
                    >
                        Try Again
                    </button>
                    <a href="/dashboard">
                        <button className="btn-secondary" style={{ width: 'auto', padding: '0.825rem 1.5rem' }}>
                            Go to Dashboard
                        </button>
                    </a>
                </div>

                <p style={{
                    marginTop: '1.25rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-tertiary)',
                }}>
                    Persistent issue? <a href="mailto:support@letjarvis.com">Contact support</a>
                </p>
            </div>
        </div>
    );
}
