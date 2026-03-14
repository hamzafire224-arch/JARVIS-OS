export default function LicenseLoading() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '25%' }} />
                <div className="skeleton skeleton-text" style={{ width: '50%', marginTop: '0.5rem' }} />
            </div>

            <div className="dashboard-content">
                {/* License Key Card skeleton */}
                <div className="skeleton-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: 0 }} />
                        <div className="skeleton" style={{ height: 24, width: 90, borderRadius: 999 }} />
                    </div>
                    <div className="skeleton" style={{ height: 50, borderRadius: 8 }} />
                    <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '0.75rem' }} />
                </div>

                {/* How to Activate skeleton */}
                <div className="skeleton-card" style={{ marginTop: '1.5rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '25%', marginBottom: '1rem' }} />
                    <div className="skeleton" style={{ height: 100, borderRadius: 8 }} />
                </div>

                {/* License Info skeleton */}
                <div className="skeleton-card" style={{ marginTop: '1.5rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '30%', marginBottom: '1rem' }} />
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ marginBottom: '1rem' }}>
                            <div className="skeleton skeleton-text" style={{ width: '40%', height: 16 }} />
                            <div className="skeleton skeleton-text" style={{ width: '75%' }} />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
