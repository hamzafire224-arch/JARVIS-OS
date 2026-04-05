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
                {/* Error Icon */}
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    fontSize: '1.75rem',
                }}>
                    ⚠️
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
                    marginBottom: '1.5rem',
                    lineHeight: 1.6,
                }}>
                    We encountered an unexpected error while loading this page.
                    {process.env.NODE_ENV === 'development' && error.message && (
                        <span style={{
                            display: 'block',
                            marginTop: '0.75rem',
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: '0.8rem',
                            color: 'var(--error)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 8,
                            wordBreak: 'break-all',
                        }}>
                            {error.message}
                        </span>
                    )}
                </p>

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
            </div>
        </div>
    );
}
