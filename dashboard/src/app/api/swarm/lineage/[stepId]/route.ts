import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── GET /api/swarm/lineage/[stepId] ─────────────────────────────
// Fetches forensic lineage tree for a given execution step.
// Returns the step details + all lineage entries ordered by relevance.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stepId: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stepId } = await params;

    // Fetch the execution step with ownership verification
    const { data: step, error: stepErr } = await supabase
      .from('swarm_execution_steps')
      .select(`
        id,
        execution_id,
        node_id,
        agent_name,
        step_type,
        input,
        output,
        status,
        duration_ms,
        created_at
      `)
      .eq('id', stepId)
      .eq('user_id', user.id)
      .single();

    if (stepErr || !step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // Fetch all lineage entries for this step, ordered by relevance (highest first)
    const { data: lineage, error: lineageErr } = await supabase
      .from('lineage_entries')
      .select(`
        id,
        source_type,
        source_ref,
        source_snippet,
        relevance_score,
        created_at
      `)
      .eq('execution_step_id', stepId)
      .eq('user_id', user.id)
      .order('relevance_score', { ascending: false });

    if (lineageErr) {
      return NextResponse.json(
        { error: 'Failed to fetch lineage entries' },
        { status: 500 },
      );
    }

    // Fetch the parent execution for context
    const { data: execution } = await supabase
      .from('swarm_executions')
      .select('id, workspace_id, status, created_at, completed_at')
      .eq('id', step.execution_id)
      .single();

    // Fetch sibling steps (other steps in the same execution) for timeline context
    const { data: siblingSteps } = await supabase
      .from('swarm_execution_steps')
      .select('id, agent_name, step_type, status, duration_ms, created_at')
      .eq('execution_id', step.execution_id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    return NextResponse.json({
      step,
      lineage: lineage ?? [],
      execution: execution ?? null,
      timeline: siblingSteps ?? [],
    });
  } catch (err) {
    console.error('[swarm/lineage] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
