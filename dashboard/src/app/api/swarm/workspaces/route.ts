import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/swarm/workspaces — List user's workspaces
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('swarm_workspaces')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaces: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/swarm/workspaces — Create a new workspace
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name as string)?.trim() || 'Default Workspace';

    if (name.length > 100) {
      return NextResponse.json({ error: 'Name must be 100 chars or less' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('swarm_workspaces')
      .insert({
        user_id: user.id,
        name,
        viewport: body.viewport ?? { x: 0, y: 0, zoom: 1 },
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspace: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
