'use client';

import React, { memo, useEffect, useState, useRef } from 'react';

/* ── Props ──────────────────────────────────────────────────── */
interface AssetIngestionVizProps {
  isIngesting: boolean;
  assetName: string;
  onComplete?: () => void;
}

/* ── Particle System (Canvas-based, off main thread layout) ── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  opacity: number;
  size: number;
}

function createParticles(count: number, width: number): Particle[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width * 0.3,
    y: 10 + Math.random() * 20,
    vx: 0.4 + Math.random() * 1.2,
    opacity: 0.2 + Math.random() * 0.6,
    size: 1.5 + Math.random() * 1.5,
  }));
}

/* ── Styles ─────────────────────────────────────────────────── */
const wrapStyle: React.CSSProperties = {
  marginTop: 8,
  borderRadius: 6,
  overflow: 'hidden',
  background: 'rgba(139, 92, 246, 0.04)',
  border: '1px solid rgba(139, 92, 246, 0.1)',
  padding: '6px 8px',
};

const canvasStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  display: 'block',
  borderRadius: 4,
};

const barOuter: React.CSSProperties = {
  width: '100%',
  height: 3,
  borderRadius: 2,
  background: 'rgba(139, 92, 246, 0.1)',
  marginTop: 6,
  overflow: 'hidden',
};

const nameStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  color: '#a5b4fc',
  marginTop: 4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/* ── Component ───────────────────────────────────────────────── */
function AssetIngestionVizComponent({ isIngesting, assetName, onComplete }: AssetIngestionVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isIngesting) {
      setProgress(0);
      return;
    }

    // Animate progress 0→100 over 2 seconds
    let p = 0;
    const timer = window.setInterval(() => {
      p += 2;
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        window.clearInterval(timer);
        onComplete?.();
      }
    }, 40);

    return () => window.clearInterval(timer);
  }, [isIngesting, onComplete]);

  // Canvas particle animation
  useEffect(() => {
    if (!isIngesting || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = 120;
    const h = canvas.height = 32;
    particlesRef.current = createParticles(12, w);

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        if (p.x > w + 4) {
          p.x = -4;
          p.opacity = 0.2 + Math.random() * 0.6;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${p.opacity})`;
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.cancelAnimationFrame(rafRef.current);
    };
  }, [isIngesting]);

  if (!isIngesting) return null;

  return (
    <div style={wrapStyle}>
      <canvas ref={canvasRef} style={canvasStyle} width={120} height={32} />
      <div style={barOuter}>
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            borderRadius: 2,
            background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
            transition: 'width 0.08s linear',
          }}
        />
      </div>
      <div style={nameStyle}>⚡ {assetName}</div>
    </div>
  );
}

export const AssetIngestionViz = memo(AssetIngestionVizComponent);
