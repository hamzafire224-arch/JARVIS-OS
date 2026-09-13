'use client';

import React, { useRef, useEffect, useCallback, memo } from 'react';
import { useConsoleStore } from '@/lib/stores/console-store';

// Inline type to avoid cross-module re-export issues
interface ConsoleEntry {
  id: string;
  timestamp: string;
  type: 'task' | 'recheck' | 'approval' | 'delegation' | 'error' | 'output' | 'system';
  agentName: string;
  message: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  data?: Record<string, unknown>;
}

// ── Status colors ───────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  running: '#f59e0b',
  completed: '#10b981',
  failed: '#ef4444',
  skipped: '#9ca3af',
};

const TYPE_ICONS: Record<string, string> = {
  task: '⚙️',
  recheck: '🛡️',
  approval: '✋',
  delegation: '🔀',
  error: '❌',
  output: '📤',
  system: '🔌',
};

// ── Single log entry (memoized) ─────────────────────────────────
const ConsoleEntryRow = memo(function ConsoleEntryRow({
  entry,
  onClick,
}: {
  entry: ConsoleEntry;
  onClick?: (stepId: string) => void;
}) {
  const time = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Extract step ID from the entry's id pattern: step-{uuid}-{timestamp}
  const stepMatch = entry.id.match(/^step-([0-9a-f-]{36})/);
  const stepId = stepMatch?.[1];
  const isClickable = !!stepId && !!onClick;

  return (
    <div
      className={`console-entry ${isClickable ? 'clickable' : ''}`}
      data-status={entry.status}
      onClick={isClickable ? () => onClick(stepId) : undefined}
      style={isClickable ? { cursor: 'pointer' } : undefined}
      title={isClickable ? 'Click to view lineage' : undefined}
    >
      <span className="console-time">{time}</span>
      <span className="console-icon">{TYPE_ICONS[entry.type] ?? '•'}</span>
      <span
        className="console-status-dot"
        style={{ background: STATUS_COLORS[entry.status] ?? '#6b7280' }}
      />
      <span className="console-agent">{entry.agentName}</span>
      <span className="console-message">{entry.message}</span>
      {isClickable && (
        <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'rgba(139,92,246,0.5)' }}>🔍</span>
      )}
    </div>
  );
});

interface ConsolePanelProps {
  onStepClick?: (stepId: string) => void;
}

// ── Console Panel ───────────────────────────────────────────────
function ConsolePanelComponent({ onStepClick }: ConsolePanelProps) {
  const entries = useConsoleStore((s) => s.entries);
  const isOpen = useConsoleStore((s) => s.isOpen);
  const toggle = useConsoleStore((s) => s.toggle);
  const clear = useConsoleStore((s) => s.clear);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, isOpen]);

  const handleClear = useCallback(() => clear(), [clear]);
  const handleToggle = useCallback(() => toggle(), [toggle]);

  return (
    <div className={`console-panel ${isOpen ? 'open' : 'collapsed'}`}>
      {/* Header bar */}
      <div className="console-header" onClick={handleToggle}>
        <div className="console-header-left">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <span className="console-title">Execution Console</span>
          {entries.length > 0 && (
            <span className="console-count">{entries.length}</span>
          )}
          {/* Live indicator */}
          {entries.some((e) => e.status === 'running') && (
            <span className="console-live-dot" />
          )}
        </div>
        <div className="console-header-right">
          {isOpen && entries.length > 0 && (
            <button
              className="console-clear-btn"
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              title="Clear logs"
            >
              Clear
            </button>
          )}
          <svg
            className={`console-chevron ${isOpen ? 'open' : ''}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Log body (virtualized via CSS overflow) */}
      {isOpen && (
        <div className="console-body" ref={scrollRef}>
          {entries.length === 0 ? (
            <div className="console-empty">
              <span>No execution logs yet. Run a swarm to see real-time output.</span>
            </div>
          ) : (
            entries.map((entry) => (
              <ConsoleEntryRow key={entry.id} entry={entry} onClick={onStepClick} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export const ConsolePanel = memo(ConsolePanelComponent);
