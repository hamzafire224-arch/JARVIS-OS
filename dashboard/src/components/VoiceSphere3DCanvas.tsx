'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface VoiceSphere3DCanvasProps {
    size?: number;
    /** Audio level from 0.0 (silent) to 1.0 (max). Drives reactive animation. */
    audioLevel?: number;
}

function AnimatedSphere({ audioLevel = 0 }: { audioLevel: number }) {
    const meshRef = useRef<THREE.Mesh>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const materialRef = useRef<any>(null);

    // Smoothed audio level for fluid transitions
    const smoothedAudio = useRef(0);

    // Animate distortion, rotation, and audio reactivity
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        // Smooth the audio level to prevent jitter
        smoothedAudio.current += (audioLevel - smoothedAudio.current) * 0.12;
        const audio = smoothedAudio.current;

        if (meshRef.current) {
            // Base rotation + audio-accelerated rotation
            meshRef.current.rotation.y = t * (0.3 + audio * 1.5);
            meshRef.current.rotation.z = Math.sin(t * 0.5) * (0.1 + audio * 0.3);

            // Scale pulse with audio
            const scaleBase = 1.6;
            const scalePulse = audio * 0.25 * Math.sin(t * 8);
            const s = scaleBase + scalePulse;
            meshRef.current.scale.setScalar(s);
        }

        if (materialRef.current) {
            // Distortion increases with audio volume
            materialRef.current.distort = 0.35 + Math.sin(t * 2) * 0.15 + audio * 0.35;

            // Emissive intensity pulses with audio
            materialRef.current.emissiveIntensity = 0.4 + audio * 1.2;

            // Speed up mesh distortion animation during speech
            materialRef.current.speed = 3 + audio * 8;
        }
    });

    // Color shifts from resting blue to active bright cyan
    const baseColor = useMemo(() => new THREE.Color('#00d4ff'), []);
    const activeColor = useMemo(() => new THREE.Color('#40efff'), []);
    const displayColor = useMemo(() => {
        const c = new THREE.Color();
        c.lerpColors(baseColor, activeColor, audioLevel);
        return c;
    }, [audioLevel, baseColor, activeColor]);

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]} scale={1.6}>
            <MeshDistortMaterial
                ref={materialRef}
                color={displayColor}
                emissive="#003366"
                emissiveIntensity={0.4}
                roughness={0.2}
                metalness={0.8}
                distort={0.4}
                speed={3}
                transparent
                opacity={0.92}
            />
        </Sphere>
    );
}

export default function VoiceSphere3DCanvas({
    size = 48,
    audioLevel = 0,
}: VoiceSphere3DCanvasProps) {
    // Clamp audio level
    const level = Math.max(0, Math.min(1, audioLevel));

    return (
        <Canvas
            style={{ width: size, height: size }}
            camera={{ position: [0, 0, 3.5], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
        >
            <ambientLight intensity={0.5 + level * 0.4} />
            <pointLight
                position={[5, 5, 5]}
                intensity={1.2 + level * 1.5}
                color="#00d4ff"
            />
            <pointLight
                position={[-3, -3, 2]}
                intensity={0.4 + level * 0.6}
                color="#ffffff"
            />
            {/* Accent light that activates with audio */}
            {level > 0.1 && (
                <pointLight
                    position={[0, -4, 3]}
                    intensity={level * 2}
                    color="#40efff"
                />
            )}
            <AnimatedSphere audioLevel={level} />
        </Canvas>
    );
}
