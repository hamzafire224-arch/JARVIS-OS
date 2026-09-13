import { Inngest } from 'inngest';

// ── Inngest Client ──────────────────────────────────────────────
// Shared client instance used by all durable functions.
// In production, INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are
// set via Vercel environment variables (Inngest Cloud).
export const inngest = new Inngest({
  id: 'jarvis-os',
  // Inngest SDK auto-reads INNGEST_EVENT_KEY from env
});

// ── Concurrency Limits ──────────────────────────────────────────
export const CONCURRENCY_LIMITS = {
  free: 3,
  pro: 10,
} as const;

// ── Shared Types ────────────────────────────────────────────────
export interface SwarmRunPayload {
  workspaceId: string;
  userId: string;
  executionId: string;
  agents: Array<{
    nodeId: string;
    agentId: string;
    agentName: string;
    systemPrompt: string;
    skills: string[];
    inputPayload: Record<string, unknown>;
  }>;
  tier: 'free' | 'pro';
}

export interface AgentTaskPayload {
  executionId: string;
  userId: string;
  nodeId: string;
  agentId: string;
  agentName: string;
  systemPrompt: string;
  skills: string[];
  inputPayload: Record<string, unknown>;
}

export interface RecheckPayload {
  executionId: string;
  userId: string;
  agentName: string;
  nodeId: string;
  agentOutput: Record<string, unknown>;
}
