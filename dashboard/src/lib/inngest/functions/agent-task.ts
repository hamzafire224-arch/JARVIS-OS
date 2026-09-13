import { createClient } from '@supabase/supabase-js';
import { inngest, type AgentTaskPayload } from '../client';

// ── Single Agent Durable Task ──────────────────────────────────
// Executes one agent's workload as a durable Inngest step.
// Updates swarm_execution_steps in real-time via Supabase CDC.
export const agentTask = inngest.createFunction(
  {
    id: 'swarm/agent-task',
    retries: 2,
    concurrency: {
      // Global limit per user to prevent runaway agent spawns
      key: 'event.data.userId',
      limit: 10,
    },
    triggers: [{ event: 'swarm/agent.execute' }],
  },
  async ({ event, step }: { event: { data: AgentTaskPayload }; step: any }) => {
    const data = event.data as AgentTaskPayload;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Step 1: Create execution step record
    const stepRecord = await step.run('create-step', async () => {
      const { data: record, error } = await supabase
        .from('swarm_execution_steps')
        .insert({
          execution_id: data.executionId,
          user_id: data.userId,
          node_id: data.nodeId,
          agent_name: data.agentName,
          step_type: 'task',
          input: data.inputPayload,
          status: 'running',
        })
        .select('id')
        .single();

      if (error) throw new Error(`Failed to create step: ${error.message}`);
      return record;
    });

    // Step 2: Update node status to 'running' (triggers CDC → canvas update)
    await step.run('set-node-running', async () => {
      await supabase
        .from('swarm_nodes')
        .update({ status: 'running' })
        .eq('id', data.nodeId);
    });

    // Step 3: Execute the agent logic
    const startTime = Date.now();
    const agentResult = await step.run('execute-agent', async () => {
      // Build the agent context from system prompt + skills
      const context = {
        agent: data.agentName,
        prompt: data.systemPrompt,
        skills: data.skills,
        input: data.inputPayload,
      };

      // If OpenAI is configured, make a real completion call
      if (process.env.OPENAI_API_KEY) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: data.systemPrompt || `You are ${data.agentName}, a specialized AI agent.` },
              { role: 'user', content: JSON.stringify(data.inputPayload) },
            ],
            max_tokens: 1024,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const completion = await response.json();
        return {
          response: completion.choices?.[0]?.message?.content ?? '',
          model: 'gpt-4o-mini',
          tokens: completion.usage?.total_tokens ?? 0,
        };
      }

      // Fallback: structured acknowledgment (no API key)
      return {
        response: `[${data.agentName}] Task processed. Input keys: ${Object.keys(context.input).join(', ')}`,
        model: 'none',
        tokens: 0,
      };
    });

    const durationMs = Date.now() - startTime;

    // Step 4: Mark step completed + update node status
    await step.run('finalize', async () => {
      await supabase
        .from('swarm_execution_steps')
        .update({
          status: 'completed',
          output: agentResult,
          duration_ms: durationMs,
        })
        .eq('id', stepRecord.id);

      await supabase
        .from('swarm_nodes')
        .update({ status: 'success' })
        .eq('id', data.nodeId);
    });

    return {
      stepId: stepRecord.id,
      nodeId: data.nodeId,
      agentName: data.agentName,
      result: agentResult,
      durationMs,
    };
  },
);
