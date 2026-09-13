'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSwarmStore, type SwarmNode, type SwarmConnection } from '@/lib/stores/swarm-store';
import { useSwarmStream } from '@/lib/realtime/use-swarm-stream';
import { nodeTypes } from './nodes';
import { useErrorToast } from '@/components/ErrorToast';

// ── Transform Supabase data ↔ React Flow format ────────────────
function toFlowNodes(nodes: SwarmNode[]): Node[] {
  return nodes.map((n) => ({
    id: n.id,
    type: n.node_type,  // Maps directly to nodeTypes keys in barrel export
    position: { x: n.position_x, y: n.position_y },
    data: {
      label: n.label,
      status: n.status,
      nodeType: n.node_type,
      config: n.config,
      refId: n.ref_id,
    },
  }));
}

function toFlowEdges(connections: SwarmConnection[]): Edge[] {
  return connections.map((c) => ({
    id: c.id,
    source: c.source_node_id,
    target: c.target_node_id,
    label: c.label || undefined,
    animated: c.animated,
    style: { stroke: 'rgba(139, 92, 246, 0.5)', strokeWidth: 2 },
  }));
}

interface SwarmCanvasProps {
  userId: string;
  workspaceId: string;
}

export function SwarmCanvas({ userId, workspaceId }: SwarmCanvasProps) {
  const { showError } = useErrorToast();
  const pendingSavesRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const storeNodes = useSwarmStore((s) => s.nodes);
  const storeConnections = useSwarmStore((s) => s.connections);
  const workspace = useSwarmStore((s) => s.workspace);
  const updateNodePosition = useSwarmStore((s) => s.updateNodePosition);
  const updateViewport = useSwarmStore((s) => s.updateViewport);

  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const debouncedPositionSave = useCallback((nodeId: string, x: number, y: number) => {
    const existing = pendingSavesRef.current.get(nodeId);
    if (existing) clearTimeout(existing);

    pendingSavesRef.current.set(
      nodeId,
      setTimeout(async () => {
        pendingSavesRef.current.delete(nodeId);
        try {
          await fetch(`/api/swarm/nodes/${nodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ positionX: x, positionY: y }),
          });
        } catch (err) {
          showError(err instanceof Error ? err.message : 'An error occurred');
        }
      }, 2000),
    );
  }, [showError]);

  useEffect(() => {
    return () => {
      pendingSavesRef.current.forEach(timer => clearTimeout(timer));
      pendingSavesRef.current.clear();
    };
  }, []);

  // Connect Supabase Realtime CDC
  useSwarmStream(userId, workspaceId);

  // Sync store → React Flow
  useEffect(() => {
    setFlowNodes(toFlowNodes(storeNodes));
  }, [storeNodes]);

  useEffect(() => {
    setFlowEdges(toFlowEdges(storeConnections));
  }, [storeConnections]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // ── React Flow callbacks ──────────────────────────────────────
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setFlowNodes((nds) => applyNodeChanges(changes, nds));
    },
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setFlowEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [],
  );

  const onConnect: OnConnect = useCallback(
    async (connection: Connection) => {
      const newEdge = { ...connection, id: `e-${connection.source}-${connection.target}-${Date.now()}`, animated: true, style: { stroke: 'rgba(139, 92, 246, 0.5)', strokeWidth: 2 } } as Edge;
      setFlowEdges((eds) => addEdge(newEdge, eds));

      // Persist to Supabase
      try {
        await fetch('/api/swarm/connections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceId,
            sourceNodeId: connection.source,
            targetNodeId: connection.target,
            animated: true,
          }),
        });
      } catch (err) {
        showError(err instanceof Error ? err.message : 'An error occurred');
      }
    },
    [workspaceId, showError],
  );

  const onNodeDragStop = useCallback(
    (_event: any, node: any) => {
      updateNodePosition(node.id, node.position.x, node.position.y);
      debouncedPositionSave(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition],
  );

  const onMoveEnd = useCallback(
    (_event: any, viewport: any) => {
      if (viewport) {
        updateViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom });
      }
    },
    [updateViewport],
  );

  const onNodesDelete = useCallback(
    async (deleted: Node[]) => {
      for (const node of deleted) {
        try {
          await fetch(`/api/swarm/nodes/${node.id}`, { method: 'DELETE' });
        } catch (err) {
          showError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    },
    [showError],
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      for (const edge of deleted) {
        try {
          await fetch(`/api/swarm/connections?id=${edge.id}`, { method: 'DELETE' });
        } catch (err) {
          showError(err instanceof Error ? err.message : 'An error occurred');
        }
      }
    },
    [showError],
  );

  if (!isLoaded) {
    return (
      <div className="swarm-canvas-loading">
        <div className="swarm-canvas-spinner" />
        <p>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="swarm-canvas-container">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        defaultViewport={workspace?.viewport ?? { x: 0, y: 0, zoom: 1 }}
        fitView={storeNodes.length > 0}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(139, 92, 246, 0.08)"
        />
        <Controls
          className="swarm-controls"
          showInteractive={false}
        />
        <MiniMap
          className="swarm-minimap"
          nodeColor={(node) => {
            const t = node.type ?? '';
            if (t === 'agent') return '#8b5cf6';
            if (t.startsWith('ingest')) return '#10b981';
            if (t.startsWith('output')) return '#3b82f6';
            if (t === 'supervisor') return '#f59e0b';
            if (t === 'skill') return '#ec4899';
            if (t === 'document') return '#06b6d4';
            return '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
          style={{ background: 'rgba(15, 15, 25, 0.9)' }}
        />
      </ReactFlow>
    </div>
  );
}
