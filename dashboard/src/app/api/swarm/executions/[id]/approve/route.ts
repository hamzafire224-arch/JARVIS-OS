import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/swarm/executions/[id]/approve — Human approval for recheck gate
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id: executionId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the execution belongs to this user and is waiting for approval
    const { data: execution, error } = await supabase
      .from('swarm_executions')
      .select('id, status, workspace_id')
      .eq('id', executionId)
      .eq('user_id', user.id)
      .single();

    if (error || !execution) {
      return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
    }

    if (execution.status !== 'waiting_approval') {
      return NextResponse.json(
        { error: `Execution is not waiting for approval. Current status: ${execution.status}` },
        { status: 400 },
      );
    }

    const body = await req.json();
    const approved = body.approved !== false; // Default to approved

    if (approved) {
      // Send approval event to Inngest — this resumes the waiting step
      await inngest.send({
        name: 'swarm/human.approved',
        data: {
          executionId,
          approvedBy: user.id,
          timestamp: new Date().toISOString(),
        },
      });

      // Update execution status back to running
      await supabase
        .from('swarm_executions')
        .update({ status: 'running' })
        .eq('id', executionId);

      return NextResponse.json({
        executionId,
        approved: true,
        message: 'Execution approved and resumed.',
      });
    } else {
      // Rejected — cancel the execution
      await supabase
        .from('swarm_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          result: { cancelledBy: user.id, reason: body.reason ?? 'User rejected' },
        })
        .eq('id', executionId);

      return NextResponse.json({
        executionId,
        approved: false,
        message: 'Execution rejected and cancelled.',
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
