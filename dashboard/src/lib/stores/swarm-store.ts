'use client';

import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────
export interface SwarmNode {
  id: string;
  workspace_id: string;
  user_id: string;
  node_type: string;
  ref_id: string | null;
  label: string;
  position_x: number;
  position_y: number;
  config: Record<string, unknown>;
  status: 'idle' | 'running' | 'success' | 'error' | 'waiting';
  created_at: string;
  updated_at: string;
}

export interface SwarmConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string;
  animated: boolean;
  created_at: string;
}

export interface SwarmWorkspace {
  id: string;
  user_id: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  created_at: string;
  updated_at: string;
}

interface SwarmState {
  // Workspace
  workspace: SwarmWorkspace | null;
  setWorkspace: (workspace: SwarmWorkspace | null) => void;
  updateViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  // Nodes
  nodes: SwarmNode[];
  setNodes: (nodes: SwarmNode[]) => void;
  addNode: (node: SwarmNode) => void;
  updateNode: (id: string, updates: Partial<SwarmNode>) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  updateNodeStatus: (id: string, status: SwarmNode['status']) => void;

  // Connections
  connections: SwarmConnection[];
  setConnections: (connections: SwarmConnection[]) => void;
  addConnection: (connection: SwarmConnection) => void;
  removeConnection: (id: string) => void;

  // Execution
  activeExecutionId: string | null;
  setActiveExecutionId: (id: string | null) => void;

  // Auto-save debounce timer
  scheduleSave: (workspaceId: string) => void;
}

// ── Debounced Auto-Save Helper ──────────────────────────────────
const AUTO_SAVE_DELAY = 2000; // 2 seconds after last change
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function persistViewport(workspaceId: string, viewport: { x: number; y: number; zoom: number }) {
  try {
    await fetch(`/api/swarm/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewport }),
    });
  } catch (err) {
    console.error('Error:', err);
    // Silent fail — viewport save is non-critical
  }
}

// ── Store ───────────────────────────────────────────────────────
export const useSwarmStore = create<SwarmState>((set, get) => ({
  // Workspace
  workspace: null,
  setWorkspace: (workspace) => set({ workspace }),
  updateViewport: (viewport) => {
    set((state) => ({
      workspace: state.workspace ? { ...state.workspace, viewport } : null,
    }));
    // Schedule debounced auto-save
    const ws = get().workspace;
    if (ws) get().scheduleSave(ws.id);
  },

  // Nodes
  nodes: [],
  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      // Also remove connections involving this node
      connections: state.connections.filter(
        (c) => c.source_node_id !== id && c.target_node_id !== id,
      ),
    })),
  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position_x: x, position_y: y } : n,
      ),
    })),
  updateNodeStatus: (id, status) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, status } : n)),
    })),

  // Connections
  connections: [],
  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    })),

  // Execution
  activeExecutionId: null,
  setActiveExecutionId: (id) => set({ activeExecutionId: id }),

  // Auto-save
  scheduleSave: (workspaceId) => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const viewport = get().workspace?.viewport;
      if (viewport) persistViewport(workspaceId, viewport);
    }, AUTO_SAVE_DELAY);
  },
}));
