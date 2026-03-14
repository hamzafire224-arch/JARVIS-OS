export default function DashboardLoading() {
    return (
        <>
            {/* Header skeleton */}
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '45%' }} />
                <div className="skeleton skeleton-text" style={{ width: '30%', marginTop: '0.5rem' }} />
            </div>

            <div className="dashboard-content">
                {/* Stats grid skeleton */}
                <div className="stats-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                            <div className="skeleton" style={{ height: 32, width: '70%', marginTop: '0.5rem' }} />
                        </div>
                    ))}
                </div>

                {/* Quick Start skeleton */}
                <div className="skeleton-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '25%' }} />
                    <div className="skeleton" style={{ height: 120, marginTop: '0.75rem' }} />
                </div>

                {/* Upgrade CTA skeleton */}
                <div className="skeleton-card">
                    <div className="skeleton skeleton-title" style={{ width: '40%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: '0.5rem' }} />
                    <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    <div className="skeleton" style={{ height: 42, width: 180, marginTop: '1rem', borderRadius: 10 }} />
                </div>
            </div>
        </>
    );
}
