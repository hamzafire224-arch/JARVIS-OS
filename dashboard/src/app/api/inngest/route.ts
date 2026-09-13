import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { swarmExecute, agentTask, supervisorRecheck } from '@/lib/inngest';

// ── Inngest Webhook Handler ────────────────────────────────────
// This API route serves as the Inngest webhook endpoint.
// Inngest Cloud sends events here; the SDK routes them to the
// correct durable function. Supports GET (dashboard UI) and
// POST (event execution).
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [swarmExecute, agentTask, supervisorRecheck],
});
