'use client';

import React, { memo, useEffect, useState, useCallback } from 'react';

/* ── Types ───────────────────────────────────────────────────── */
interface LineageStep {
  id: string;
  execution_id: string;
  node_id: string | null;
  agent_name: string;
  step_type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface LineageEntry {
  id: string;
  source_type: string;
  source_ref: string;
  source_snippet: string;
  relevance_score: number;
  created_at: string;
}

interface TimelineStep {
  id: string;
  agent_name: string;
  step_type: string;
  status: string;
  duration_ms: number | null;
  created_at: string;
}

interface LineageResponse {
  step: LineageStep;
  lineage: LineageEntry[];
  execution: Record<string, unknown> | null;
  timeline: TimelineStep[];
}

interface ForensicLineageTreeProps {
  stepId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/* ── Source type metadata ─────────────────────────────────────── */
const SOURCE_META: Record<string, { icon: string; label: string; color: string }> = {
  vector_memory:       { icon: '🧠', label: 'Vector Memory',       color: '#8b5cf6' },
  scraped_url:         { icon: '🌐', label: 'Scraped URL',         color: '#3b82f6' },
  document:            { icon: '📄', label: 'Document',            color: '#06b6d4' },
  prompt_constraint:   { icon: '🎯', label: 'Prompt Constraint',   color: '#f59e0b' },
  marketplace_skill:   { icon: '⚡', label: 'Marketplace Skill',   color: '#ec4899' },
  user_input:          { icon: '💬', label: 'User Input',          color: '#10b981' },
  omnichannel_message: { icon: '📨', label: 'Omnichannel Message', color: '#f97316' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  running: '#f59e0b',
  completed: '#10b981',
  failed: '#ef4444',
  skipped: '#9ca3af',
};

/* ── Helpers ─────────────────────────────────────────────────── */
function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function relevanceColor(score: number): string {
  if (score > 0.8) return '#10b981';
  if (score > 0.5) return '#3b82f6';
  return '#f59e0b';
}

/* ── Inline Styles ───────────────────────────────────────────── */
const panelStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: 420,
  height: '100vh',
  background: 'rgba(10, 10, 18, 0.92)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderLeft: '1px solid rgba(139, 92, 246, 0.15)',
  zIndex: 901,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '-8px 0 40px rgba(0, 0, 0, 0.5)',
  animation: 'lineage-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  color: '#fff',
  fontFamily: 'inherit',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.4)',
  zIndex: 900,
  animation: 'lineage-fade-in 0.2s ease',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#9ca3af',
  fontSize: '1.25rem',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: 6,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '16px 20px',
};

const summaryCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: 10,
  padding: '14px 16px',
  marginBottom: 16,
};

const makeBadge = (color: string): React.CSSProperties => ({
  fontSize: '0.65rem',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 99,
  background: `${color}20`,
  color,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  display: 'inline-block',
});

const timelineLineStyle: React.CSSProperties = {
  borderLeft: '1px solid rgba(139, 92, 246, 0.2)',
  marginLeft: 12,
  paddingLeft: 20,
  position: 'relative',
};

const entryCardStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: 8,
  padding: '10px 12px',
  marginBottom: 12,
  position: 'relative',
};

const makeDot = (color: string): React.CSSProperties => ({
  position: 'absolute',
  left: -26,
  top: 14,
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  border: '2px solid rgba(10, 10, 18, 0.92)',
  boxShadow: `0 0 6px ${color}40`,
});

/* ── Skeleton ────────────────────────────────────────────────── */
function SkeletonCards() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            ...entryCardStyle,
            height: 80,
            animation: 'lineage-fade-in 0.8s ease infinite alternate',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */
function ForensicLineageTreeComponent({ stepId, isOpen, onClose }: ForensicLineageTreeProps) {
  const [data, setData] = useState<LineageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLineage = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/swarm/lineage/${id}`);
      if (!res.ok) throw new Error('Failed to fetch lineage');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && stepId) {
      fetchLineage(stepId);
    } else {
      setData(null);
    }
  }, [isOpen, stepId, fetchLineage]);

  if (!isOpen) return null;

  const step = data?.step;
  const lineage = data?.lineage ?? [];
  const statusColor = STATUS_COLORS[step?.status ?? 'pending'] ?? '#6b7280';

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />

      <div style={panelStyle} className="lineage-panel">
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Forensic Lineage</span>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {loading && <SkeletonCards />}

          {error && (
            <div style={{ ...summaryCardStyle, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <span style={{ color: '#ef4444', fontSize: '0.85rem' }}>⚠️ {error}</span>
            </div>
          )}

          {!loading && !error && step && (
            <>
              {/* Step Summary */}
              <div style={summaryCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
                    display: 'inline-block',
                  }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {step.agent_name || 'Unknown Agent'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={makeBadge(statusColor)}>{step.status}</span>
                  <span style={makeBadge('#8b5cf6')}>{step.step_type}</span>
                  {step.duration_ms != null && (
                    <span style={makeBadge('#06b6d4')}>{formatDuration(step.duration_ms)}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                  {new Date(step.created_at).toLocaleString()}
                </div>
              </div>

              {/* Section label */}
              <div style={{
                fontSize: '0.75rem', fontWeight: 600, color: '#8b5cf6',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                Source Lineage ({lineage.length} entries)
              </div>

              {/* Timeline */}
              {lineage.length === 0 ? (
                <div style={{
                  ...summaryCardStyle, textAlign: 'center',
                  padding: '24px 16px', color: '#6b7280', fontSize: '0.8rem',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🌿</div>
                  No lineage data recorded for this step.
                </div>
              ) : (
                <div style={timelineLineStyle}>
                  {lineage.map((entry) => {
                    const meta = SOURCE_META[entry.source_type] ?? {
                      icon: '📎', label: entry.source_type, color: '#6b7280',
                    };
                    const relColor = relevanceColor(entry.relevance_score);

                    return (
                      <div key={entry.id} style={entryCardStyle}>
                        <div style={makeDot(meta.color)} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: '1rem' }}>{meta.icon}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: meta.color }}>
                            {meta.label}
                          </span>
                          <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: '#6b7280' }}>
                            {timeAgo(entry.created_at)}
                          </span>
                        </div>

                        {entry.source_ref && (
                          <div style={{
                            fontSize: '0.7rem', fontFamily: 'monospace', color: '#a5b4fc',
                            background: 'rgba(139, 92, 246, 0.06)', padding: '3px 6px',
                            borderRadius: 4, marginBottom: 6, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                          }}>
                            {entry.source_ref.length > 60 ? entry.source_ref.slice(0, 60) + '…' : entry.source_ref}
                          </div>
                        )}

                        {entry.source_snippet && (
                          <div style={{
                            fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic',
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            lineHeight: 1.4, marginBottom: 8,
                          }}>
                            {entry.source_snippet}
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '0.6rem', color: '#6b7280' }}>Relevance</span>
                          <div style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: 'rgba(255, 255, 255, 0.05)', overflow: 'hidden',
                          }}>
                            <div style={{
                              width: `${Math.round(entry.relevance_score * 100)}%`,
                              height: '100%', borderRadius: 2, background: relColor,
                              transition: 'width 0.3s ease',
                            }} />
                          </div>
                          <span style={{ fontSize: '0.6rem', color: relColor, fontWeight: 600 }}>
                            {Math.round(entry.relevance_score * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export const ForensicLineageTree = memo(ForensicLineageTreeComponent);
