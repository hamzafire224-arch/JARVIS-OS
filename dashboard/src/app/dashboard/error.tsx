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
            <div style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: 16,
                padding: '2.5rem',
                maxWidth: 480,
                width: '100%',
                textAlign: 'center',
            }}>
                {/* Error Icon */}
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#fef2f2',
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
                    color: '#111827',
                    marginBottom: '0.5rem',
                }}>
                    Something went wrong
                </h2>

                <p style={{
                    color: '#6b7280',
                    fontSize: '0.9rem',
                    marginBottom: '1.5rem',
                    lineHeight: 1.6,
                }}>
                    We encountered an unexpected error while loading this page.
                    {process.env.NODE_ENV === 'development' && error.message && (
                        <span style={{
                            display: 'block',
                            marginTop: '0.75rem',
                            fontFamily: 'monospace',
                            fontSize: '0.8rem',
                            color: '#b91c1c',
                            background: '#fef2f2',
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
