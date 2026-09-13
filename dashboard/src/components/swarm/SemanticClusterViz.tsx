'use client';

import React, { memo } from 'react';

/* ── Types ──────────────────────────────────────────────────── */
interface Cluster {
  label: string;
  weight: number;
}

interface SemanticClusterVizProps {
  clusters: Cluster[];
  isActive: boolean;
}

/* ── Constants ──────────────────────────────────────────────── */
const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];
const MAX_VISIBLE = 6;

/* ── Styles ─────────────────────────────────────────────────── */
const wrapStyle: React.CSSProperties = {
  marginTop: 8,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
  maxHeight: 60,
  overflow: 'hidden',
  alignItems: 'center',
};

/* ── Component ───────────────────────────────────────────────── */
function SemanticClusterVizComponent({ clusters, isActive }: SemanticClusterVizProps) {
  if (!clusters.length) return null;

  const visible = clusters.slice(0, MAX_VISIBLE);
  const remaining = clusters.length - MAX_VISIBLE;

  return (
    <>
      {isActive && (
        <style>{`
          @keyframes semantic-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      )}
      <div style={wrapStyle}>
        {visible.map((c, i) => {
          const color = COLORS[i % COLORS.length];
          const alpha = Math.round(c.weight * 40 + 15).toString(16).padStart(2, '0');

          return (
            <span
              key={c.label}
              style={{
                fontSize: '0.55rem',
                padding: '1px 5px',
                borderRadius: 4,
                background: `${color}${alpha}`,
                color,
                fontWeight: 500,
                animation: isActive ? 'semantic-pulse 2s ease-in-out infinite' : undefined,
                animationDelay: isActive ? `${i * 0.15}s` : undefined,
              }}
            >
              {c.label}
            </span>
          );
        })}
        {remaining > 0 && (
          <span style={{ fontSize: '0.5rem', color: '#6b7280' }}>
            +{remaining} more
          </span>
        )}
      </div>
    </>
  );
}

export const SemanticClusterViz = memo(SemanticClusterVizComponent);
