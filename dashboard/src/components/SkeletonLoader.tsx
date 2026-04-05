export function DashboardSkeleton() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '40%' }} />
                <div className="skeleton skeleton-text" style={{ width: '25%', marginTop: '0.5rem' }} />
            </div>
            <div className="dashboard-content">
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton-card" style={{ height: 120 }}>
                            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                            <div className="skeleton skeleton-title" style={{ width: '40%', marginTop: '0.75rem' }} />
                            <div className="skeleton skeleton-text" style={{ width: '70%', marginTop: '0.5rem' }} />
                        </div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div className="skeleton-card" style={{ height: 260 }} />
                    <div className="skeleton-card" style={{ height: 260 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div className="skeleton-card" style={{ height: 200 }} />
                    <div className="skeleton-card" style={{ height: 200 }} />
                </div>
            </div>
        </>
    );
}

export function UsageSkeleton() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '30%' }} />
                <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '0.5rem' }} />
            </div>
            <div className="dashboard-content">
                <div className="stats-grid">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton-card" style={{ height: 100 }}>
                            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                            <div className="skeleton skeleton-title" style={{ width: '35%', marginTop: '0.5rem' }} />
                        </div>
                    ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                    <div className="skeleton-card" style={{ height: 220 }} />
                    <div className="skeleton-card" style={{ height: 220 }} />
                </div>
            </div>
        </>
    );
}

export function ActivitySkeleton() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '20%' }} />
                <div className="skeleton skeleton-text" style={{ width: '35%', marginTop: '0.5rem' }} />
            </div>
            <div className="dashboard-content">
                <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton-card" style={{ height: 90 }}>
                            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                            <div className="skeleton skeleton-title" style={{ width: '30%', marginTop: '0.5rem' }} />
                        </div>
                    ))}
                </div>
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-card" style={{ height: 80, marginBottom: '1rem' }}>
                        <div className="skeleton skeleton-title" style={{ width: '60%' }} />
                        <div className="skeleton skeleton-text" style={{ width: '40%', marginTop: '0.5rem' }} />
                    </div>
                ))}
            </div>
        </>
    );
}

export function SettingsSkeleton() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '20%' }} />
                <div className="skeleton skeleton-text" style={{ width: '45%', marginTop: '0.5rem' }} />
            </div>
            <div className="dashboard-content">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton-card" style={{ height: 140, marginBottom: '1.5rem' }}>
                        <div className="skeleton skeleton-title" style={{ width: '35%' }} />
                        <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: '1rem' }} />
                        <div className="skeleton skeleton-text" style={{ width: '60%', marginTop: '0.5rem' }} />
                    </div>
                ))}
            </div>
        </>
    );
}

export function BillingSkeleton() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '20%' }} />
                <div className="skeleton skeleton-text" style={{ width: '35%', marginTop: '0.5rem' }} />
            </div>
            <div className="dashboard-content">
                <div className="skeleton-card" style={{ height: 120, marginBottom: '1.5rem' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="skeleton-card" style={{ height: 280 }} />
                    <div className="skeleton-card" style={{ height: 280 }} />
                </div>
            </div>
        </>
    );
}
