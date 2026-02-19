export default function SettingsLoading() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" style={{ width: '20%' }} />
                <div className="skeleton skeleton-text" style={{ width: '35%', marginTop: '0.5rem' }} />
            </div>

            <div className="dashboard-content">
                {/* Profile skeleton */}
                <div className="skeleton-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '15%', marginBottom: '1rem' }} />
                    {[1, 2].map((i) => (
                        <div key={i} style={{ marginBottom: '1.25rem' }}>
                            <div className="skeleton skeleton-text" style={{ width: '15%', height: 12 }} />
                            <div className="skeleton" style={{ height: 42, marginTop: '0.375rem', borderRadius: 10 }} />
                        </div>
                    ))}
                    <div className="skeleton" style={{ height: 42, width: 140, borderRadius: 10, marginTop: '0.5rem' }} />
                </div>

                {/* Change Password skeleton */}
                <div className="skeleton-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="skeleton skeleton-title" style={{ width: '25%', marginBottom: '1rem' }} />
                    {[1, 2].map((i) => (
                        <div key={i} style={{ marginBottom: '1.25rem' }}>
                            <div className="skeleton skeleton-text" style={{ width: '20%', height: 12 }} />
                            <div className="skeleton" style={{ height: 42, marginTop: '0.375rem', borderRadius: 10 }} />
                        </div>
                    ))}
                    <div className="skeleton" style={{ height: 42, width: 160, borderRadius: 10, marginTop: '0.5rem' }} />
                </div>

                {/* Danger Zone skeleton */}
                <div className="skeleton-card" style={{ borderColor: '#fecaca' }}>
                    <div className="skeleton skeleton-title" style={{ width: '20%', marginBottom: '0.5rem' }} />
                    <div className="skeleton skeleton-text" style={{ width: '65%' }} />
                    <div className="skeleton" style={{ height: 42, width: 160, borderRadius: 10, marginTop: '1rem' }} />
                </div>
            </div>
        </>
    );
}
