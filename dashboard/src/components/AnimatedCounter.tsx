'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
}

export function AnimatedCounter({
    value,
    duration = 1200,
    prefix = '',
    suffix = '',
    decimals = 0,
    className = '',
}: AnimatedCounterProps) {
    const [display, setDisplay] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const startTime = useRef<number>(0);
    const rafId = useRef<number>(0);

    useEffect(() => {
        startTime.current = performance.now();
        const startVal = 0;
        const endVal = value;

        const step = (now: number) => {
            const elapsed = now - startTime.current;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (endVal - startVal) * eased;

            setDisplay(current);

            if (progress < 1) {
                rafId.current = requestAnimationFrame(step);
            }
        };

        rafId.current = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId.current);
    }, [value, duration]);

    const formatted = display.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return (
        <span ref={ref} className={`stat-value-animated ${className}`}>
            {prefix}{formatted}{suffix}
        </span>
    );
}
