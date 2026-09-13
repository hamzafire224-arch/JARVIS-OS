'use client';

import { useMemo } from 'react';

interface TrainingCinematicProps {
    progress: number;
    onComplete?: () => void;
}

interface Phase {
    name: string;
    icon: string;
    range: [number, number];
    color: string;
}

const PHASES: Phase[] = [
    { name: 'Analyzing Skill Trees', icon: '🔬', range: [0, 25], color: '#00d4ff' },
    { name: 'Vector Index Alignment', icon: '🧠', range: [25, 50], color: '#8b5cf6' },
    { name: 'Behavioral Anchoring', icon: '🔐', range: [50, 75], color: '#f59e0b' },
    { name: 'System Operational', icon: '✅', range: [75, 100], color: '#22c55e' },
];

export default function TrainingCinematic({ progress, onComplete }: TrainingCinematicProps) {
    const clamped = Math.max(0, Math.min(100, progress));

    const currentPhase = useMemo(() => {
        if (clamped >= 100) return PHASES[3];
        return PHASES.find(p => clamped >= p.range[0] && clamped < p.range[1]) || PHASES[0];
    }, [clamped]);

    const phaseIndex = PHASES.indexOf(currentPhase!);

    // SVG ring calculations
    const size = 140;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    if (clamped >= 100 && onComplete) {
        // Fire on next tick to avoid render-phase side effects
        setTimeout(onComplete, 0);
    }

    return (
        <>
            <style>{`
                @keyframes tc-ring-pulse { 0%, 100% { filter: drop-shadow(0 0 4px ${currentPhase!.color}40); } 50% { filter: drop-shadow(0 0 12px ${currentPhase!.color}80); } }
                @keyframes tc-phase-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes tc-scan { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
                @keyframes tc-spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1.5rem 0' }}>
                {/* SVG Ring */}
                <div style={{ position: 'relative', width: size, height: size }}>
                    <svg
                        width={size} height={size}
                        style={{ animation: 'tc-ring-pulse 2.5s ease-in-out infinite', transform: 'rotate(-90deg)' }}
                    >
                        {/* Background ring */}
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth}
                        />
                        {/* Progress ring */}
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none" stroke={currentPhase!.color} strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
                        />
                    </svg>
                    {/* Center content */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: '1.75rem', lineHeight: 1, marginBottom: '0.25rem' }}>
                            {currentPhase!.icon}
                        </div>
                        <div style={{
                            fontSize: '1.25rem', fontWeight: 700,
                            color: currentPhase!.color,
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {Math.round(clamped)}%
                        </div>
                    </div>
                </div>

                {/* Phase label card */}
                <div style={{
                    padding: '0.6rem 1.25rem', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${currentPhase!.color}30`,
                    backdropFilter: 'blur(8px)',
                    animation: 'tc-phase-fade 0.4s ease forwards',
                }}>
                    <div style={{
                        fontSize: '0.8rem', fontWeight: 600,
                        color: currentPhase!.color,
                        animation: clamped < 100 ? 'tc-scan 1.5s ease-in-out infinite' : 'none',
                        letterSpacing: '0.03em',
                    }}>
                        {currentPhase!.name}
                    </div>
                </div>

                {/* Phase indicators */}
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {PHASES.map((phase, i) => (
                        <div key={i} style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: i <= phaseIndex ? phase.color : 'rgba(255,255,255,0.1)',
                            transition: 'background 0.3s ease',
                            boxShadow: i === phaseIndex ? `0 0 8px ${phase.color}60` : 'none',
                        }} />
                    ))}
                </div>
            </div>
        </>
    );
}
