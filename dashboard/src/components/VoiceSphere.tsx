'use client';

import { Suspense, lazy, useMemo } from 'react';

/**
 * VoiceSphere — Electro-blue 3D animated sphere
 *
 * Static mode (isSpeaking=false): Renders a lightweight SVG orb
 * Active mode (isSpeaking=true):  Lazy-loads the Three.js Canvas
 *
 * This ensures zero Three.js bundle cost unless actively speaking.
 */

interface VoiceSphereProps {
    isSpeaking: boolean;
    size?: number;
}

// Lazy-load the heavy 3D canvas only when needed
const VoiceSphere3D = lazy(() => import('./VoiceSphere3DCanvas'));

export function VoiceSphere({ isSpeaking, size = 48 }: VoiceSphereProps) {
    if (!isSpeaking) {
        return <StaticOrb size={size} />;
    }

    return (
        <Suspense fallback={<StaticOrb size={size} pulsing />}>
            <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}>
                <VoiceSphere3D size={size} />
            </div>
        </Suspense>
    );
}

/**
 * Static SVG orb — ultra-lightweight placeholder
 */
function StaticOrb({ size = 48, pulsing = false }: { size?: number; pulsing?: boolean }) {
    const gradientId = useMemo(() => `orb-grad-${Math.random().toString(36).slice(2, 8)}`, []);

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                position: 'relative',
                animation: pulsing ? 'voice-orb-pulse 1.5s ease-in-out infinite' : undefined,
            }}
        >
            <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id={gradientId} cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#66e5ff" />
                        <stop offset="40%" stopColor="#00d4ff" />
                        <stop offset="100%" stopColor="#0066aa" />
                    </radialGradient>
                </defs>
                <circle cx="24" cy="24" r="22" fill={`url(#${gradientId})`} />
                {/* Highlight reflection */}
                <ellipse cx="18" cy="16" rx="6" ry="4" fill="rgba(255,255,255,0.25)" />
            </svg>
            <style>{`
                @keyframes voice-orb-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.08); opacity: 0.85; }
                }
            `}</style>
        </div>
    );
}

export default VoiceSphere;
