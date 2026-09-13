import { createClient } from '@supabase/supabase-js';
import { inngest, CONCURRENCY_LIMITS, type SwarmRunPayload } from '../client';

// ── Main Swarm Orchestrator ────────────────────────────────────
// The top-level durable function that fans out agent tasks,
// collects results, runs supervisor rechecks, and delivers
// final output. Survives serverless timeouts via Inngest steps.
export const swarmExecute = inngest.createFunction(
  {
    id: 'swarm/execute',
    retries: 1,
    concurrency: {
      key: 'event.data.userId',
      limit: 1, // Only one swarm run per user at a time
    },
    triggers: [{ event: 'swarm/run.started' }],
  },
  async ({ event, step }: { event: { data: SwarmRunPayload }; step: any }) => {
    const data = event.data as SwarmRunPayload;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Enforce tier concurrency limits
    const maxAgents = CONCURRENCY_LIMITS[data.tier] ?? CONCURRENCY_LIMITS.free;
    const agentsToRun = data.agents.slice(0, maxAgents);

    // Step 1: Mark execution as running
    await step.run('mark-running', async () => {
      await supabase
        .from('swarm_executions')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', data.executionId);
    });

    // Step 2: Fan-out — invoke each agent task in parallel
    const agentResults = await Promise.all(
      agentsToRun.map((agent) =>
        step.invoke(`agent-${agent.nodeId}`, {
          function: agentTask,
          data: {
            executionId: data.executionId,
            userId: data.userId,
            nodeId: agent.nodeId,
            agentId: agent.agentId,
            agentName: agent.agentName,
            systemPrompt: agent.systemPrompt,
            skills: agent.skills,
            inputPayload: agent.inputPayload,
          },
        }),
      ),
    );

    // Step 3: Run supervisor recheck on each result
    const recheckResults = await Promise.all(
      agentResults.map((result) =>
        step.invoke(`recheck-${result.nodeId}`, {
          function: supervisorRecheck,
          data: {
            executionId: data.executionId,
            userId: data.userId,
            agentName: result.agentName,
            nodeId: result.nodeId,
            agentOutput: result.result,
          },
        }),
      ),
    );

    // Step 4: Aggregate results and finalize
    const finalStatus = recheckResults.every((r) => r.approved) ? 'completed' : 'failed';

    await step.run('finalize-execution', async () => {
      await supabase
        .from('swarm_executions')
        .update({
          status: finalStatus,
          result: {
            agentCount: agentResults.length,
            results: agentResults.map((r) => ({
              agent: r.agentName,
              nodeId: r.nodeId,
              durationMs: r.durationMs,
              output: r.result,
            })),
            recheckSummary: recheckResults.map((r) => ({
              approved: r.approved,
              reason: r.reason,
              flags: r.flags,
            })),
          },
          completed_at: new Date().toISOString(),
        })
        .eq('id', data.executionId);

      // Reset all node statuses back to idle
      const nodeIds = agentsToRun.map((a) => a.nodeId);
      if (nodeIds.length > 0) {
        await supabase
          .from('swarm_nodes')
          .update({ status: 'idle' })
          .in('id', nodeIds);
      }
    });

    return {
      executionId: data.executionId,
      status: finalStatus,
      agentCount: agentResults.length,
      totalDurationMs: agentResults.reduce((sum, r) => sum + r.durationMs, 0),
    };
  },
);

// Re-import for step.invoke references
import { agentTask } from './agent-task';
import { supervisorRecheck } from './supervisor-recheck';
