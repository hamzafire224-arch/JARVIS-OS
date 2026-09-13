import { createClient } from '@supabase/supabase-js';
import { inngest, type RecheckPayload } from '../client';

// ── Supervisor Recheck Gate ────────────────────────────────────
// Intercepts agent output before delivery. If the output is
// flagged (guardrails, confidence, or policy), it pauses the
// execution and waits for human approval via waitForEvent.
export const supervisorRecheck = inngest.createFunction(
  {
    id: 'swarm/supervisor-recheck',
    retries: 1,
    triggers: [{ event: 'swarm/recheck.requested' }],
  },
  async ({ event, step }: { event: { data: RecheckPayload }; step: any }) => {
    const data = event.data as RecheckPayload;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Step 1: Create a recheck step record
    const recheckStep = await step.run('create-recheck-step', async () => {
      const { data: record, error } = await supabase
        .from('swarm_execution_steps')
        .insert({
          execution_id: data.executionId,
          user_id: data.userId,
          node_id: data.nodeId,
          agent_name: `Supervisor → ${data.agentName}`,
          step_type: 'recheck',
          input: data.agentOutput,
          status: 'running',
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create recheck step: ${error.message}`);
      return record;
    });

    // Step 2: Evaluate the agent output against guardrails
    const evaluation = await step.run('evaluate-output', async () => {
      const output = JSON.stringify(data.agentOutput).toLowerCase();

      // Guardrail checks
      const flags: string[] = [];

      // Check for sensitive content patterns
      const sensitivePatterns = [
        'password', 'secret', 'api_key', 'token', 'credential',
        'ssn', 'social security', 'credit card',
      ];
      for (const pattern of sensitivePatterns) {
        if (output.includes(pattern)) {
          flags.push(`sensitive_data:${pattern}`);
        }
      }

      // Check for potentially harmful actions
      const actionPatterns = [
        'delete all', 'drop table', 'rm -rf', 'format disk',
        'send money', 'transfer funds', 'execute payment',
      ];
      for (const pattern of actionPatterns) {
        if (output.includes(pattern)) {
          flags.push(`dangerous_action:${pattern}`);
        }
      }

      // Check response length (extremely long responses may indicate hallucination)
      if (output.length > 10000) {
        flags.push('excessive_length');
      }

      return {
        passed: flags.length === 0,
        flags,
        confidence: flags.length === 0 ? 1.0 : Math.max(0, 1.0 - flags.length * 0.25),
      };
    });

    // Step 3: If flagged, pause and wait for human approval
    if (!evaluation.passed) {
      // Update execution status to waiting_approval (triggers CDC → console + canvas)
      await step.run('request-approval', async () => {
        await supabase
          .from('swarm_executions')
          .update({ status: 'waiting_approval' })
          .eq('id', data.executionId);

        await supabase
          .from('swarm_execution_steps')
          .update({
            status: 'pending',
            output: {
              evaluation,
              message: `Supervisor flagged output from ${data.agentName}. Awaiting human approval.`,
            },
          })
          .eq('id', recheckStep.id);
      });

      // Wait for human approval event (up to 24 hours)
      const approval = await step.waitForEvent('wait-for-approval', {
        event: 'swarm/human.approved',
        match: 'data.executionId',
        timeout: '24h',
      });

      if (!approval) {
        // Timeout — mark as failed
        await step.run('timeout-step', async () => {
          await supabase
            .from('swarm_execution_steps')
            .update({ status: 'failed', output: { reason: 'Approval timeout (24h)' } })
            .eq('id', recheckStep.id);
        });

        return { approved: false, reason: 'timeout', flags: evaluation.flags };
      }

      // Human approved
      await step.run('approval-granted', async () => {
        await supabase
          .from('swarm_execution_steps')
          .update({
            status: 'completed',
            output: {
              evaluation,
              approval: { approved: true, approvedBy: approval.data?.approvedBy ?? 'user' },
            },
          })
          .eq('id', recheckStep.id);
      });

      return { approved: true, reason: 'human_approved', flags: evaluation.flags };
    }

    // Step 4: Auto-approved (no flags)
    await step.run('auto-approve', async () => {
      await supabase
        .from('swarm_execution_steps')
        .update({
          status: 'completed',
          output: { evaluation, message: 'Auto-approved by supervisor. No flags detected.' },
        })
        .eq('id', recheckStep.id);
    });

    return { approved: true, reason: 'auto_approved', flags: [] };
  },
);
