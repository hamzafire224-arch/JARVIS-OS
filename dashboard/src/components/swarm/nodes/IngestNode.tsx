'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

/* ── Data shape ─────────────────────────────────────────────── */
interface IngestNodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  nodeType?: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const BORDER_COLOR = '#10b981';

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

/* ── Channel Icons ──────────────────────────────────────────── */
function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="#34d399" stroke="none" />
    </svg>
  );
}

function WebIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function ChannelIcon({ nodeType }: { nodeType?: string }) {
  switch (nodeType) {
    case 'ingest_whatsapp':
      return <WhatsAppIcon />;
    case 'ingest_instagram':
      return <InstagramIcon />;
    case 'ingest_web':
      return <WebIcon />;
    default:
      return <WebIcon />;
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
function IngestNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as IngestNodeData;
  const status = nodeData.status ?? 'idle';

  return (
    <div className="swarm-node-ingest" style={cardStyle}>
      <div style={headerStyle}>
        <ChannelIcon nodeType={nodeData.nodeType} />
        <StatusDot status={status} />
        <div style={labelStyle}>{nodeData.label ?? 'Ingest'}</div>
      </div>

      {/* Source only — data flows OUT from ingest nodes */}
      <Handle
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
    </div>
  );
}

export const IngestNode = memo(IngestNodeComponent);
