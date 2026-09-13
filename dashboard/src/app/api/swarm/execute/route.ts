import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

// POST /api/swarm/execute — Trigger a swarm execution run
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const workspaceId = body.workspaceId as string;

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    // Fetch workspace nodes that are agents
    const { data: agentNodes, error: nodesErr } = await supabase
      .from('swarm_nodes')
      .select('id, ref_id, label, config')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('node_type', 'agent');

    if (nodesErr) {
      return NextResponse.json({ error: nodesErr.message }, { status: 500 });
    }

    if (!agentNodes || agentNodes.length === 0) {
      return NextResponse.json(
        { error: 'No agent nodes found in workspace. Add at least one agent.' },
        { status: 400 },
      );
    }

    // Fetch the actual agent records for system prompts + skills
    const agentIds = agentNodes
      .filter((n) => n.ref_id)
      .map((n) => n.ref_id!);

    let agentsMap: Record<string, { name: string; system_prompt: string; skills: string[] }> = {};

    if (agentIds.length > 0) {
      const { data: agents } = await supabase
        .from('custom_agents')
        .select('id, name, system_prompt, skills')
        .in('id', agentIds);

      if (agents) {
        agentsMap = Object.fromEntries(agents.map((a) => [a.id, a]));
      }
    }

    // Determine user tier
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle();

    const tier = (subscription?.plan === 'pro' || subscription?.plan === 'productivity')
      ? 'pro' as const
      : 'free' as const;

    // Create execution record
    const { data: execution, error: execErr } = await supabase
      .from('swarm_executions')
      .insert({
        workspace_id: workspaceId,
        user_id: user.id,
        status: 'pending',
        trigger_event: {
          triggeredBy: 'user',
          agentCount: agentNodes.length,
          timestamp: new Date().toISOString(),
        },
      })
      .select('id')
      .single();

    if (execErr || !execution) {
      return NextResponse.json({ error: execErr?.message ?? 'Failed to create execution' }, { status: 500 });
    }

    // Build agent payloads
    const agentPayloads = agentNodes.map((node) => {
      const agent = node.ref_id ? agentsMap[node.ref_id] : null;
      return {
        nodeId: node.id,
        agentId: node.ref_id ?? node.id,
        agentName: agent?.name ?? node.label,
        systemPrompt: agent?.system_prompt ?? '',
        skills: agent?.skills ?? [],
        inputPayload: (node.config as Record<string, unknown>) ?? {},
      };
    });

    // Send event to Inngest to start durable execution
    await inngest.send({
      name: 'swarm/run.started',
      data: {
        workspaceId,
        userId: user.id,
        executionId: execution.id,
        agents: agentPayloads,
        tier,
      },
    });

    return NextResponse.json({
      executionId: execution.id,
      agentCount: agentPayloads.length,
      tier,
      status: 'pending',
    }, { status: 202 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
