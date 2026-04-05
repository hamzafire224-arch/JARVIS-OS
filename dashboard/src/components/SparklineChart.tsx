'use client';

interface SparklineChartProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    showDots?: boolean;
    className?: string;
}

export function SparklineChart({
    data,
    width = 120,
    height = 36,
    color,
    showDots = false,
    className = '',
}: SparklineChartProps) {
    if (!data.length) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const padding = 4;

    const points = data.map((val, i) => ({
        x: padding + (i / (data.length - 1)) * (width - padding * 2),
        y: padding + (1 - (val - min) / range) * (height - padding * 2),
    }));

    // Smooth line using quadratic bezier
    const pathD = points.reduce((acc, point, i) => {
        if (i === 0) return `M ${point.x},${point.y}`;
        const prev = points[i - 1]!;
        const cpX = (prev.x + point.x) / 2;
        return `${acc} Q ${cpX},${prev.y} ${(cpX + point.x) / 2},${(prev.y + point.y) / 2}`;
    }, '');

    // Area path (close to bottom)
    const areaD = `${pathD} L ${points[points.length - 1]!.x},${height} L ${points[0]!.x},${height} Z`;

    const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`sparkline-svg ${className}`}
        >
            <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color || 'var(--accent-1)'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color || 'var(--accent-1)'} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${gradientId})`} className="sparkline-area" />
            <path
                d={pathD}
                className="sparkline-line"
                style={color ? { stroke: color } : undefined}
            />
            {showDots && points.map((p, i) => (
                <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={i === points.length - 1 ? 3 : 0}
                    className="sparkline-dot"
                    style={color ? { fill: color } : undefined}
                />
            ))}
        </svg>
    );
}
