import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/swarm/connections?workspaceId=xxx — List connections
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
      .from('swarm_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connections: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/swarm/connections — Create a new edge between nodes
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.workspaceId || !body.sourceNodeId || !body.targetNodeId) {
      return NextResponse.json(
        { error: 'workspaceId, sourceNodeId, and targetNodeId are required' },
        { status: 400 },
      );
    }

    // Prevent self-connections
    if (body.sourceNodeId === body.targetNodeId) {
      return NextResponse.json({ error: 'Cannot connect a node to itself' }, { status: 400 });
    }

    // Check for duplicate connections
    const { data: existing } = await supabase
      .from('swarm_connections')
      .select('id')
      .eq('workspace_id', body.workspaceId)
      .eq('source_node_id', body.sourceNodeId)
      .eq('target_node_id', body.targetNodeId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Connection already exists' }, { status: 409 });
    }

    const { data, error } = await supabase
      .from('swarm_connections')
      .insert({
        workspace_id: body.workspaceId,
        user_id: user.id,
        source_node_id: body.sourceNodeId,
        target_node_id: body.targetNodeId,
        label: body.label ?? '',
        animated: body.animated ?? false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/connections?id=xxx — Delete a connection
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('swarm_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
