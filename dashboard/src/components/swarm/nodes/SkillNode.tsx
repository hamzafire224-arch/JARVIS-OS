'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/* ── Data shape ─────────────────────────────────────────────── */
interface SkillNodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  nodeType?: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const BORDER_COLOR = '#ec4899';

const statusColors: Record<string, string> = {
  idle: '#6b7280',
  running: '#f59e0b',
  success: '#10b981',
  error: '#ef4444',
  waiting: '#8b5cf6',
};

/* ── Styles ─────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 15, 25, 0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderLeft: `3px solid ${BORDER_COLOR}`,
  borderRadius: 12,
  padding: '12px 16px',
  minWidth: 180,
  color: '#fff',
  fontFamily: 'inherit',
  position: 'relative',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: BORDER_COLOR,
  border: '2px solid rgba(0, 0, 0, 0.4)',
};

/* ── Icon ───────────────────────────────────────────────────── */
function LightningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/* ── Status dot ─────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const color = statusColors[status] ?? statusColors.idle;
  const isRunning = status === 'running';

  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color,
        display: 'inline-block',
        flexShrink: 0,
        boxShadow: isRunning ? `0 0 6px ${color}` : undefined,
        animation: isRunning ? 'swarm-node-pulse 1.5s ease-in-out infinite' : undefined,
      }}
    />
  );
}

/* ── Component ──────────────────────────────────────────────── */
function SkillNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const status = nodeData.status ?? 'idle';

  return (
    <div className="swarm-node-skill" style={cardStyle}>
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <div style={headerStyle}>
        <LightningIcon />
        <StatusDot status={status} />
        <div style={labelStyle}>{nodeData.label ?? 'Skill'}</div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
    </div>
  );
}

export const SkillNode = memo(SkillNodeComponent);
