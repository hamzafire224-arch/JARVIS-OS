'use client';

import React, { memo, useCallback, useState } from 'react';
import { useSwarmStore } from '@/lib/stores/swarm-store';
import { useConsoleStore } from '@/lib/stores/console-store';
import { useErrorToast } from '@/components/ErrorToast';

interface CanvasToolbarProps {
  workspaceId: string;
}

function CanvasToolbarComponent({ workspaceId }: CanvasToolbarProps) {
  const { showError } = useErrorToast();
  const nodes = useSwarmStore((s) => s.nodes);
  const activeExecutionId = useSwarmStore((s) => s.activeExecutionId);
  const setActiveExecutionId = useSwarmStore((s) => s.setActiveExecutionId);
  const addEntry = useConsoleStore((s) => s.addEntry);
  const setConsoleOpen = useConsoleStore((s) => s.setOpen);

  const [isRunning, setIsRunning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const agentCount = nodes.filter((n) => n.node_type === 'agent').length;
  const runningCount = nodes.filter((n) => n.status === 'running').length;

  // ── Execute Swarm ─────────────────────────────────────────────
  const handleExecute = useCallback(async () => {
    if (agentCount === 0) return;
    setIsRunning(true);
    setConsoleOpen(true);

    addEntry({
      id: `toolbar-exec-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'system',
      agentName: 'Toolbar',
      message: `Initiating swarm execution with ${agentCount} agents...`,
      status: 'running',
    });

    try {
      const res = await fetch('/api/swarm/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });

      const data = await res.json();

      if (res.ok) {
        setActiveExecutionId(data.executionId);
        addEntry({
          id: `toolbar-started-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'system',
          agentName: 'Toolbar',
          message: `Swarm started → ${data.executionId} (${data.tier} tier, ${data.agentCount} agents)`,
          status: 'running',
        });
      } else {
        addEntry({
          id: `toolbar-err-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'error',
          agentName: 'Toolbar',
          message: `Failed: ${data.error}`,
          status: 'failed',
        });
      }
    } catch (err) {
      addEntry({
        id: `toolbar-err-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'error',
        agentName: 'Toolbar',
        message: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
        status: 'failed',
      });
    } finally {
      setIsRunning(false);
    }
  }, [workspaceId, agentCount, setActiveExecutionId, addEntry, setConsoleOpen]);

  // ── Approve (when waiting) ────────────────────────────────────
  const handleApprove = useCallback(async () => {
    if (!activeExecutionId) return;
    setIsApproving(true);

    try {
      await fetch(`/api/swarm/executions/${activeExecutionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true }),
      });

      addEntry({
        id: `toolbar-approved-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'approval',
        agentName: 'Human',
        message: 'Execution approved — resuming...',
        status: 'completed',
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsApproving(false);
    }
  }, [activeExecutionId, addEntry, showError]);

  const hasWaitingNodes = nodes.some((n) => n.status === 'waiting');

  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar-left">
        <div className="canvas-toolbar-status">
          <span className="canvas-toolbar-count">{nodes.length} nodes</span>
          {runningCount > 0 && (
            <span className="canvas-toolbar-running">
              <span className="pulse-dot" />
              {runningCount} running
            </span>
          )}
        </div>
      </div>

      <div className="canvas-toolbar-right">
        {hasWaitingNodes && (
          <button
            className="toolbar-btn toolbar-btn-approve"
            onClick={handleApprove}
            disabled={isApproving || !activeExecutionId}
          >
            {isApproving ? (
              <span className="toolbar-spinner" />
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Approve
              </>
            )}
          </button>
        )}

        <button
          className="toolbar-btn toolbar-btn-run"
          onClick={handleExecute}
          disabled={isRunning || agentCount === 0}
          title={agentCount === 0 ? 'Add at least one agent node' : `Execute ${agentCount} agents`}
        >
          {isRunning ? (
            <span className="toolbar-spinner" />
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Run Swarm
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export const CanvasToolbar = memo(CanvasToolbarComponent);
