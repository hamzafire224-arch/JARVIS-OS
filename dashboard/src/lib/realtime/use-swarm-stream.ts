'use client';

import { useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useSwarmStore } from '@/lib/stores/swarm-store';
import { useConsoleStore, type ConsoleEntry } from '@/lib/stores/console-store';

// ── Supabase Realtime CDC Hook ──────────────────────────────────
// Subscribes to real-time PostgreSQL changes on swarm tables,
// filtered by user_id for multi-tenant isolation. Pushes
// mutations directly into Zustand stores so React Flow nodes
// and the console panel update instantly without HTTP polling.
export function useSwarmStream(userId: string | null, workspaceId: string | null) {
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);
  const updateNodeStatus = useSwarmStore((s) => s.updateNodeStatus);
  const updateNode = useSwarmStore((s) => s.updateNode);
  const addEntry = useConsoleStore((s) => s.addEntry);

  useEffect(() => {
    if (!userId || !workspaceId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel(`swarm:${workspaceId}`)
      // ── Node status changes (running/success/error) ────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'swarm_nodes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const node = payload.new as Record<string, unknown>;
          const nodeId = node.id as string;

          // Update canvas node status via Zustand (triggers React Flow re-render of ONLY this node)
          updateNodeStatus(nodeId, node.status as 'idle' | 'running' | 'success' | 'error' | 'waiting');

          // Push to console log
          addEntry({
            id: `node-${nodeId}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'system',
            agentName: (node.label as string) ?? 'Unknown',
            message: `Node status → ${node.status}`,
            status: node.status === 'running' ? 'running' : 'completed',
          });
        },
      )
      // ── Execution status changes ───────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swarm_executions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const execution = payload.new as Record<string, unknown>;
          const status = execution.status as string;

          addEntry({
            id: `exec-${execution.id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: status === 'waiting_approval' ? 'approval' : 'system',
            agentName: 'Swarm Orchestrator',
            message: `Execution ${execution.id} → ${status}`,
            status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'running',
            data: { executionId: execution.id, status },
          });
        },
      )
      // ── Execution step changes (per-agent task logs) ───────
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swarm_execution_steps',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const step = payload.new as Record<string, unknown>;
          const stepType = step.step_type as ConsoleEntry['type'];

          addEntry({
            id: `step-${step.id}-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: stepType,
            agentName: (step.agent_name as string) ?? 'Unknown',
            message: stepType === 'recheck'
              ? `Supervisor recheck: ${step.status}`
              : `${step.agent_name} → ${step.status}`,
            status: step.status as ConsoleEntry['status'],
            data: step.output as Record<string, unknown> | undefined,
          });
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          addEntry({
            id: `system-connected-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: 'system',
            agentName: 'CDC Stream',
            message: `Real-time stream connected for workspace ${workspaceId}`,
            status: 'completed',
          });
        }
      });

    channelRef.current = channel;

    // Cleanup on unmount or workspace change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, workspaceId, updateNodeStatus, updateNode, addEntry]);
}
