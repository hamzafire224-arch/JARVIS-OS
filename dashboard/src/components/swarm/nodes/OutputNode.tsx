'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/* ── Data shape ─────────────────────────────────────────────── */
interface OutputNodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  nodeType?: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const BORDER_COLOR = '#3b82f6';

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

/* ── Output Icons ───────────────────────────────────────────── */
function ResponseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function WebhookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function OutputIcon({ nodeType }: { nodeType?: string }) {
  switch (nodeType) {
    case 'output_email':
      return <EmailIcon />;
    case 'output_webhook':
      return <WebhookIcon />;
    case 'output_response':
    default:
      return <ResponseIcon />;
  }
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
function OutputNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as OutputNodeData;
  const status = nodeData.status ?? 'idle';

  return (
    <div className="swarm-node-output" style={cardStyle}>
      {/* Target only — data flows IN to output nodes */}
      <Handle
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <div style={headerStyle}>
        <OutputIcon nodeType={nodeData.nodeType} />
        <StatusDot status={status} />
        <div style={labelStyle}>{nodeData.label ?? 'Output'}</div>
      </div>
    </div>
  );
}

export const OutputNode = memo(OutputNodeComponent);
