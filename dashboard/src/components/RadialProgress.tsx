'use client';

import { useEffect, useState } from 'react';

interface RadialProgressProps {
    value: number;
    max: number;
    size?: number;
    strokeWidth?: number;
    label?: string;
    sublabel?: string;
    color?: string;
    className?: string;
}

export function RadialProgress({
    value,
    max,
    size = 80,
    strokeWidth = 6,
    label,
    sublabel,
    color,
    className = '',
}: RadialProgressProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 200);
        return () => clearTimeout(timer);
    }, []);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(value / max, 1);
    const offset = mounted ? circumference * (1 - percentage) : circumference;
    const center = size / 2;

    const gradientId = `radial-${Math.random().toString(36).slice(2, 8)}`;

    return (
        <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={color || 'var(--accent-1)'} />
                            <stop offset="100%" stopColor={color || 'var(--accent-2)'} />
                        </linearGradient>
                    </defs>
                    <circle
                        className="radial-bg"
                        cx={center}
                        cy={center}
                        r={radius}
                    />
                    <circle
                        className="radial-fill"
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={`url(#${gradientId})`}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                    />
                </svg>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <span style={{
                        fontSize: size > 60 ? '1.1rem' : '0.85rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontVariantNumeric: 'tabular-nums',
                    }}>
                        {Math.round(percentage * 100)}%
                    </span>
                </div>
            </div>
            {label && (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {label}
                </span>
            )}
            {sublabel && (
                <span style={{ fontSize: '0.675rem', color: 'var(--text-tertiary)' }}>
                    {sublabel}
                </span>
            )}
        </div>
    );
}
