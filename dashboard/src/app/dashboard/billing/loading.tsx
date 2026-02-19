export default function BillingLoading() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '20%' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '0.5rem' }} />
            </div>

            <div className="dashboard-content">
                {/* Current Plan skeleton */}
                <div className="skeleton-card" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div className="skeleton skeleton-title" style={{ width: '25%', marginBottom: 0 }} />
                        <div className="skeleton" style={{ height: 24, width: 90, borderRadius: 999 }} />
                    </div>
                    <div className="skeleton skeleton-text" style={{ width: '70%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '55%' }} />

                    {/* Plan comparison grid skeleton */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
                            <div className="skeleton skeleton-title" style={{ width: '60%' }} />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + i * 5}%` }} />
                            ))}
                        </div>
                        <div style={{ border: '2px solid #e5e7eb', borderRadius: 12, padding: '1.25rem' }}>
                            <div className="skeleton skeleton-title" style={{ width: '60%' }} />
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + i * 5}%` }} />
                            ))}
                        </div>
                    </div>

                    <div className="skeleton" style={{ height: 44, width: 260, marginTop: '1.5rem', borderRadius: 10 }} />
                </div>

                {/* FAQ skeleton */}
                <div className="skeleton-card">
                    <div className="skeleton skeleton-title" style={{ width: '20%', marginBottom: '1rem' }} />
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ marginBottom: '1rem' }}>
                            <div className="skeleton skeleton-text" style={{ width: '35%', height: 16 }} />
                            <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
