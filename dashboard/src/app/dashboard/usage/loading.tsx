export default function UsageLoading() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
            <div className="dashboard-content">
                <div className="stats-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="skeleton-card">
                            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                            <div className="skeleton skeleton-title" style={{ width: '30%' }} />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
