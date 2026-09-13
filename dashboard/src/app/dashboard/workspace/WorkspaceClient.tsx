'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { SwarmCanvas } from '@/components/swarm/SwarmCanvas';
import { ConsolePanel } from '@/components/swarm/ConsolePanel';
import { CanvasToolbar } from '@/components/swarm/CanvasToolbar';
import { NodePalette } from '@/components/swarm/NodePalette';
import { ForensicLineageTree } from '@/components/swarm/ForensicLineageTree';
import { useSwarmStore } from '@/lib/stores/swarm-store';

interface WorkspaceClientProps {
  userId: string;
}

export function WorkspaceClient({ userId }: WorkspaceClientProps) {
  const setWorkspace = useSwarmStore((s) => s.setWorkspace);
  const setNodes = useSwarmStore((s) => s.setNodes);
  const setConnections = useSwarmStore((s) => s.setConnections);
  const workspace = useSwarmStore((s) => s.workspace);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState(true);
  const [lineageStepId, setLineageStepId] = useState<string | null>(null);
  const [showLineage, setShowLineage] = useState(false);

  const openLineage = useCallback((stepId: string) => {
    setLineageStepId(stepId);
    setShowLineage(true);
  }, []);

  const closeLineage = useCallback(() => {
    setShowLineage(false);
    setLineageStepId(null);
  }, []);

  // ── Load or create workspace on mount ─────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Try to load existing workspaces
        const listRes = await fetch('/api/swarm/workspaces');
        const listData = await listRes.json();

        let ws;

        if (listData.workspaces?.length > 0) {
          // Load the most recent workspace
          ws = listData.workspaces[0];
        } else {
          // Create default workspace
          const createRes = await fetch('/api/swarm/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'My Workspace' }),
          });
          const createData = await createRes.json();
          ws = createData.workspace;
        }

        if (cancelled) return;

        // Load full workspace with nodes + connections
        const detailRes = await fetch(`/api/swarm/workspaces/${ws.id}`);
        const detailData = await detailRes.json();

        if (cancelled) return;

        setWorkspace(detailData.workspace);
        setNodes(detailData.nodes ?? []);
        setConnections(detailData.connections ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load workspace');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [setWorkspace, setNodes, setConnections]);

  const togglePalette = useCallback(() => setShowPalette((p) => !p), []);

  // ── Loading state ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="workspace-loading">
        <div className="workspace-loading-inner">
          <div className="workspace-spinner" />
          <h2>Initializing Swarm Workspace</h2>
          <p>Loading canvas, agents, and connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-error">
        <div className="workspace-error-inner">
          <span className="workspace-error-icon">⚠️</span>
          <h2>Workspace Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="workspace-container">
      {/* Top toolbar */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <h1 className="workspace-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
            {workspace.name}
          </h1>
          <span className="workspace-badge">Live</span>
        </div>
        <div className="workspace-header-right">
          <button
            className={`toolbar-btn toolbar-btn-palette ${showPalette ? 'active' : ''}`}
            onClick={togglePalette}
            title="Toggle node palette"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Nodes
          </button>
        </div>
      </div>

      {/* Canvas toolbar (run/approve/status) */}
      <CanvasToolbar workspaceId={workspace.id} />

      {/* Main content area */}
      <div className="workspace-body">
        {/* Node palette sidebar */}
        {showPalette && (
          <NodePalette workspaceId={workspace.id} />
        )}

        {/* Infinite canvas */}
        <div className="workspace-canvas-area">
          <SwarmCanvas userId={userId} workspaceId={workspace.id} />
        </div>
      </div>

      {/* Split-screen console */}
      <ConsolePanel onStepClick={openLineage} />

      {/* Forensic Lineage Panel */}
      <ForensicLineageTree
        stepId={lineageStepId}
        isOpen={showLineage}
        onClose={closeLineage}
      />
    </div>
  );
}
