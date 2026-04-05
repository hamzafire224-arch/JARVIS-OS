'use client';

interface HeatmapGridProps {
    /** 7 rows × N columns of values (0-4 intensity) */
    data: number[][];
    className?: string;
}

export function HeatmapGrid({ data, className = '' }: HeatmapGridProps) {
    // Generate date labels for the last N weeks
    const weeks = data[0]?.length || 13;
    const today = new Date();

    const getDateLabel = (weekOffset: number, dayOffset: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (weeks - 1 - weekOffset) * 7 - (6 - dayOffset));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

    return (
        <div className={className}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {/* Day labels column */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 3,
                    justifyContent: 'center', paddingRight: '0.25rem',
                }}>
                    {dayLabels.map((label, i) => (
                        <div key={i} style={{
                            fontSize: '0.6rem', color: 'var(--text-tertiary)',
                            height: label ? 'auto' : 0, minHeight: label ? 14 : 14,
                            display: 'flex', alignItems: 'center',
                        }}>
                            {label}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div style={{ flex: 1 }}>
                    <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
                        {Array.from({ length: 7 }, (_, day) =>
                            Array.from({ length: weeks }, (_, week) => {
                                const level = data[day]?.[week] || 0;
                                const dateStr = getDateLabel(week, day);
                                const levelLabels = ['No activity', '1-2 tasks', '3-5 tasks', '6-10 tasks', '10+ tasks'];
                                return (
                                    <div
                                        key={`${day}-${week}`}
                                        className="heatmap-cell"
                                        data-level={level}
                                    >
                                        <span className="heatmap-tip">
                                            {levelLabels[level]} · {dateStr}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Legend */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                        gap: '0.25rem', marginTop: '0.5rem',
                    }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginRight: '0.25rem' }}>Less</span>
                        {[0, 1, 2, 3, 4].map(level => (
                            <div key={level} style={{
                                width: 12, height: 12, borderRadius: 2,
                                background: level === 0 ? 'var(--bg-tertiary)'
                                    : `rgba(16, 185, 129, ${level * 0.2 + 0.1})`,
                            }} />
                        ))}
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)', marginLeft: '0.25rem' }}>More</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
