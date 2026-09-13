import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id] — Get a single agent by ID
 */
export async function GET(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: agent, error } = await supabase
            .from('custom_agents')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (error || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        return NextResponse.json({ agent });
    } catch (err) {
        console.error('[Agents] GET by ID error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * PATCH /api/agents/[id] — Update agent fields
 * Body: { name?, persona?, system_prompt?, skills?, avatar_emoji? }
 */
export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership first
        const { data: existing, error: fetchError } = await supabase
            .from('custom_agents')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        const body = await request.json();
        const allowedFields = ['name', 'persona', 'system_prompt', 'skills', 'avatar_emoji'];
        const updates: Record<string, unknown> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        // Validate name if provided
        if (updates.name !== undefined) {
            if (typeof updates.name !== 'string' || (updates.name as string).trim().length === 0) {
                return NextResponse.json({ error: 'Agent name cannot be empty' }, { status: 400 });
            }
            if ((updates.name as string).trim().length > 50) {
                return NextResponse.json({ error: 'Agent name must be 50 characters or less' }, { status: 400 });
            }
            updates.name = (updates.name as string).trim();
        }

        // Validate skills if provided
        if (updates.skills !== undefined && !Array.isArray(updates.skills)) {
            return NextResponse.json({ error: 'Skills must be an array' }, { status: 400 });
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { data: agent, error: updateError } = await supabase
            .from('custom_agents')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('[Agents] Update error:', updateError);
            return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
        }

        return NextResponse.json({ agent });
    } catch (err) {
        console.error('[Agents] PATCH error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/agents/[id] — Delete an agent
 */
export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership before delete
        const { data: existing, error: fetchError } = await supabase
            .from('custom_agents')
            .select('id')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        const { error: deleteError } = await supabase
            .from('custom_agents')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (deleteError) {
            console.error('[Agents] Delete error:', deleteError);
            return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
        }

        return NextResponse.json({ message: 'Agent deleted successfully' });
    } catch (err) {
        console.error('[Agents] DELETE error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
