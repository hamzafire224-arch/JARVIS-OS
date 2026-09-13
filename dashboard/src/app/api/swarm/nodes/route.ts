import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_NODE_TYPES = [
  'agent', 'ingest_whatsapp', 'ingest_instagram', 'ingest_web',
  'output_response', 'output_email', 'output_webhook',
  'skill', 'document', 'supervisor',
] as const;

// GET /api/swarm/nodes?workspaceId=xxx — List nodes for a workspace
export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('swarm_nodes')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ nodes: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/swarm/nodes — Create a new node on the canvas
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }
    if (!body.nodeType || !VALID_NODE_TYPES.includes(body.nodeType)) {
      return NextResponse.json(
        { error: `nodeType must be one of: ${VALID_NODE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('swarm_nodes')
      .insert({
        workspace_id: body.workspaceId,
        user_id: user.id,
        node_type: body.nodeType,
        ref_id: body.refId ?? null,
        label: (body.label as string)?.trim() || body.nodeType,
        position_x: body.positionX ?? 0,
        position_y: body.positionY ?? 0,
        config: body.config ?? {},
        status: 'idle',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ node: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
