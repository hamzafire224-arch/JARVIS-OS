'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <head>
                <title>PersonalJARVIS — Error</title>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                margin: 0,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0b10',
                color: '#f1f5f9',
            }}>
                <div style={{
                    background: 'rgba(22, 24, 34, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 16,
                    padding: '2.5rem',
                    maxWidth: 480,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(12px)',
                }}>
                    {/* JARVIS Logo */}
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.6 }}>
                        An unexpected error occurred. Our team has been notified.
                    </p>
                    {error.digest && (
                        <p style={{
                            color: '#64748b',
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            marginBottom: '1.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 8,
                        }}>
                            Error ID: {error.digest}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={reset}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.75rem 1.75rem',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                border: 'none',
                                borderRadius: 10,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            Reload Page
                        </button>
                        <a
                            href="/dashboard"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0.75rem 1.75rem',
                                background: 'rgba(255, 255, 255, 0.06)',
                                color: '#94a3b8',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 10,
                                textDecoration: 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            Go to Dashboard
                        </a>
                    </div>

                    <p style={{
                        marginTop: '1.5rem',
                        fontSize: '0.8rem',
                        color: '#64748b',
                    }}>
                        Need help? <a href="mailto:support@letjarvis.com" style={{ color: '#10b981', textDecoration: 'none' }}>Contact support</a>
                    </p>
                </div>
            </body>
        </html>
    );
}
