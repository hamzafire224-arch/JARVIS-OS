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
                background: 'linear-gradient(135deg, #f8f9fc 0%, #eef0f7 100%)',
            }}>
                <div style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 16,
                    padding: '2.5rem',
                    maxWidth: 440,
                    width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.06)',
                }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                    }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        An unexpected error occurred. Please try reloading the page.
                    </p>

                    <button
                        onClick={reset}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.75rem 2rem',
                            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            border: 'none',
                            borderRadius: 10,
                            cursor: 'pointer',
                        }}
                    >
                        Reload Page
                    </button>
                </div>
            </body>
        </html>
    );
}
