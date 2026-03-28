export default function ActivityLoading() {
    return (
        <>
            <div className="dashboard-header">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            </div>
            <div className="dashboard-content">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton-card" style={{ marginBottom: '1rem' }}>
                        <div className="skeleton skeleton-title" />
                        <div className="skeleton skeleton-text" />
                        <div className="skeleton skeleton-text" style={{ width: '60%' }} />
                    </div>
                ))}
            </div>
        </>
    );
}
