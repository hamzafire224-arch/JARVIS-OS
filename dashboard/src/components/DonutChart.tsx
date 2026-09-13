'use client';

import { useEffect, useState } from 'react';

interface DonutSegment {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    segments: DonutSegment[];
    size?: number;
    strokeWidth?: number;
    centerLabel?: string;
    centerValue?: string;
    className?: string;
}

export function DonutChart({
    segments,
    size = 160,
    strokeWidth = 20,
    centerLabel,
    centerValue,
    className = '',
}: DonutChartProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 100);
        return () => clearTimeout(timer);
    }, []);

    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let cumulativeOffset = 0;

    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                {segments.map((segment, i) => {
                    const segmentLength = (segment.value / total) * circumference;
                    const gapSize = 4;
                    const dashLength = Math.max(0, segmentLength - gapSize);
                    const dashOffset = mounted ? -cumulativeOffset : circumference;
                    cumulativeOffset += segmentLength;

                    return (
                        <circle
                            key={i}
                            className="donut-segment"
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={segment.color}
                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                            strokeDashoffset={dashOffset}
                            style={{ transitionDelay: `${i * 150}ms` }}
                        />
                    );
                })}
            </svg>

            {/* Center text overlay */}
            {(centerLabel || centerValue) && (
                <div style={{
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: size,
                    height: size,
                }}>
                    {centerValue && (
                        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {centerValue}
                        </span>
                    )}
                    {centerLabel && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {centerLabel}
                        </span>
                    )}
                </div>
            )}

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
                {segments.map((segment, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <span style={{
                            width: 10, height: 10, borderRadius: 3,
                            background: segment.color, flexShrink: 0,
                        }} />
                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{segment.label}</span>
                        <span style={{ color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                            {total > 0 ? Math.round((segment.value / total) * 100) : 0}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
