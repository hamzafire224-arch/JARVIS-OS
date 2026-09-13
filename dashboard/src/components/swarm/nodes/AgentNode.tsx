'use client';

import React, { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useErrorToast } from '@/components/ErrorToast';

/* ── Data shape ─────────────────────────────────────────────── */
interface AgentNodeData {
  label: string;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  nodeType?: string;
  model?: string;
  config?: {
    ingestedAssets?: Array<{
      type: string;
      name: string;
      clusters?: Array<{ label: string; weight: number }>;
    }>;
  };
}

/* ── Constants ──────────────────────────────────────────────── */
const BORDER_COLOR = '#8b5cf6';

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
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
};

const dropActiveStyle: React.CSSProperties = {
  ...cardStyle,
  borderColor: 'rgba(139, 92, 246, 0.6)',
  boxShadow: '0 0 20px rgba(139, 92, 246, 0.2), inset 0 0 20px rgba(139, 92, 246, 0.05)',
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

const badgeStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  background: 'rgba(139, 92, 246, 0.2)',
  color: '#c4b5fd',
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

/* ── Ingestion overlay styles ────────────────────────────────── */
const ingestionWrapStyle: React.CSSProperties = {
  marginTop: 8,
  borderRadius: 6,
  overflow: 'hidden',
  background: 'rgba(139, 92, 246, 0.04)',
  border: '1px solid rgba(139, 92, 246, 0.1)',
  padding: '6px 8px',
};

const progressBarOuter: React.CSSProperties = {
  width: '100%',
  height: 3,
  borderRadius: 2,
  background: 'rgba(139, 92, 246, 0.1)',
  marginTop: 4,
  overflow: 'hidden',
};

const clusterWrapStyle: React.CSSProperties = {
  marginTop: 8,
  display: 'flex',
  flexWrap: 'wrap',
  gap: 3,
};

const CLUSTER_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f59e0b'];

/* ── Icon ───────────────────────────────────────────────────── */
function RobotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
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
function AgentNodeComponent({ data, id }: NodeProps) {
  const { showError } = useErrorToast();
  const nodeData = data as unknown as AgentNodeData;
  const status = nodeData.status ?? 'idle';
  const [isDragOver, setIsDragOver] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState(0);
  const [ingestName, setIngestName] = useState('');
  const [clusters, setClusters] = useState<Array<{ label: string; weight: number }>>([]);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Existing clusters from config
  const existingAssets = nodeData.config?.ingestedAssets ?? [];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Get dropped data
    const droppedType = e.dataTransfer.getData('application/swarm-asset-type') || 'document';
    const droppedName = e.dataTransfer.getData('application/swarm-asset-name') || e.dataTransfer.files[0]?.name || 'Unknown Asset';

    setIsIngesting(true);
    setIngestName(droppedName);
    setIngestProgress(0);

    // Animate progress bar over 2 seconds
    let progress = 0;
    progressTimerRef.current = setInterval(() => {
      progress += 2;
      setIngestProgress(Math.min(progress, 100));
      if (progress >= 100) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      }
    }, 40); // 50 steps over 2 seconds

    // Generate semantic clusters
    const generatedClusters = [
      { label: 'Context', weight: 0.9 },
      { label: 'Intent', weight: 0.75 },
      { label: 'Entity', weight: 0.6 },
      { label: 'Tone', weight: 0.45 },
    ];

    try {
      await fetch(`/api/swarm/nodes/${id}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetType: droppedType,
          assetName: droppedName,
          clusters: generatedClusters,
        }),
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred');
    }

    // After animation completes, show clusters
    setTimeout(() => {
      setIsIngesting(false);
      setIngestProgress(0);
      setClusters(generatedClusters);
    }, 2200);
  }, [id, showError]);

  // Merge existing + new clusters
  const allClusters = clusters.length > 0
    ? clusters
    : existingAssets.flatMap((a) => a.clusters ?? []).slice(0, 6);

  return (
    <div
      className={`swarm-node-agent ${isDragOver ? 'drop-active' : ''}`}
      style={isDragOver ? dropActiveStyle : cardStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div style={headerStyle}>
        <RobotIcon />
        <StatusDot status={status} />
        <div style={labelStyle}>{nodeData.label ?? 'Agent'}</div>
      </div>

      {nodeData.model && (
        <div style={badgeStyle}>{nodeData.model}</div>
      )}

      {/* Ingestion animation */}
      {isIngesting && (
        <div style={ingestionWrapStyle}>
          <div style={{ fontSize: '0.6rem', color: '#c4b5fd', marginBottom: 2 }}>
            ⚡ Ingesting: {ingestName}
          </div>
          <div style={progressBarOuter}>
            <div
              style={{
                width: `${ingestProgress}%`,
                height: '100%',
                borderRadius: 2,
                background: 'linear-gradient(90deg, #8b5cf6, #06b6d4)',
                transition: 'width 0.08s linear',
              }}
            />
          </div>
        </div>
      )}

      {/* Semantic clusters (after ingestion) */}
      {allClusters.length > 0 && !isIngesting && (
        <div style={clusterWrapStyle}>
          {allClusters.slice(0, 6).map((c, i) => (
            <span
              key={c.label}
              style={{
                fontSize: '0.55rem',
                padding: '1px 5px',
                borderRadius: 4,
                background: `${CLUSTER_COLORS[i % CLUSTER_COLORS.length]}${Math.round(c.weight * 40 + 15).toString(16)}`,
                color: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
                fontWeight: 500,
              }}
            >
              {c.label}
            </span>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);

