'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/* ── Data shape ─────────────────────────────────────────────── */
interface SupervisorNodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  nodeType?: string;
  approved?: boolean;
}

/* ── Constants ──────────────────────────────────────────────── */
const BORDER_COLOR = '#f59e0b';

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

const approvalBadgeBase: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '2px 6px',
  borderRadius: 6,
  marginTop: 6,
  display: 'inline-block',
};

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: BORDER_COLOR,
  border: '2px solid rgba(0, 0, 0, 0.4)',
};

/* ── Icon ───────────────────────────────────────────────────── */
function ShieldEyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fcd34d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="3" />
      <line x1="12" y1="8" x2="12" y2="8" />
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
function SupervisorNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as SupervisorNodeData;
  const status = nodeData.status ?? 'idle';
  const approved = nodeData.approved;

  const approvalBadgeStyle: React.CSSProperties = {
    ...approvalBadgeBase,
    background:
      approved === true
        ? 'rgba(16, 185, 129, 0.2)'
        : approved === false
          ? 'rgba(239, 68, 68, 0.2)'
          : 'rgba(245, 158, 11, 0.2)',
    color:
      approved === true
        ? '#6ee7b7'
        : approved === false
          ? '#fca5a5'
          : '#fcd34d',
  };

  return (
    <div className="swarm-node-supervisor" style={cardStyle}>
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <div style={headerStyle}>
        <ShieldEyeIcon />
        <StatusDot status={status} />
        <div style={labelStyle}>{nodeData.label ?? 'Supervisor'}</div>
      </div>

      <div style={approvalBadgeStyle}>
        {approved === true ? '✓ Approved' : approved === false ? '✗ Rejected' : '⏳ Pending'}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
    </div>
  );
}

export const SupervisorNode = memo(SupervisorNodeComponent);
