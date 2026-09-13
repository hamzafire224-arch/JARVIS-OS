import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/swarm/workspaces/[id] — Get workspace with nodes + connections
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: workspace, error } = await supabase
      .from('swarm_workspaces')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Fetch nodes and connections for this workspace
    const [nodesRes, connectionsRes] = await Promise.all([
      supabase
        .from('swarm_nodes')
        .select('*')
        .eq('workspace_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('swarm_connections')
        .select('*')
        .eq('workspace_id', id)
        .order('created_at', { ascending: true }),
    ]);

    return NextResponse.json({
      workspace,
      nodes: nodesRes.data ?? [],
      connections: connectionsRes.data ?? [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/swarm/workspaces/[id] — Update workspace (name, viewport)
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = (body.name as string).trim();
      if (name.length === 0 || name.length > 100) {
        return NextResponse.json({ error: 'Name must be 1-100 chars' }, { status: 400 });
      }
      updates.name = name;
    }
    if (body.viewport !== undefined) {
      updates.viewport = body.viewport;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('swarm_workspaces')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/workspaces/[id] — Delete workspace (cascades nodes + connections)
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('swarm_workspaces')
      .delete()
      .eq('id', id)
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
