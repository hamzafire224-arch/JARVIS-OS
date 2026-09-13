/**
 * Swarm Node Components — barrel export
 *
 * Usage with React Flow:
 *   import { nodeTypes } from '@/components/swarm/nodes';
 *   <ReactFlow nodeTypes={nodeTypes} ... />
 */

export { AgentNode } from './AgentNode';
export { IngestNode } from './IngestNode';
export { OutputNode } from './OutputNode';
export { SupervisorNode } from './SupervisorNode';
export { SkillNode } from './SkillNode';
export { DocumentNode } from './DocumentNode';

/* ── Re-import for the nodeTypes map ────────────────────────── */
import { AgentNode } from './AgentNode';
import { IngestNode } from './IngestNode';
import { OutputNode } from './OutputNode';
import { SupervisorNode } from './SupervisorNode';
import { SkillNode } from './SkillNode';
import { DocumentNode } from './DocumentNode';

/**
 * Pre-built nodeTypes object for React Flow.
 *
 * Maps every `node_type` string stored in SwarmNode.node_type
 * to its corresponding React component.
 *
 * Ingest and Output subtypes all map to the same component —
 * each component reads `data.nodeType` internally to pick the
 * correct icon.
 */
export const nodeTypes = {
  // Core agent
  agent: AgentNode,

  // Ingest sources
  ingest_whatsapp: IngestNode,
  ingest_instagram: IngestNode,
  ingest_web: IngestNode,

  // Output sinks
  output_response: OutputNode,
  output_email: OutputNode,
  output_webhook: OutputNode,

  // Supervisor gate
  supervisor: SupervisorNode,

  // Marketplace skills
  skill: SkillNode,

  // Document / knowledge base
  document: DocumentNode,
} as const;
