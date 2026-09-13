import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ id: string }>;
}

/**
 * POST /api/agents/[id]/train — Start agent training
 * Sets status to 'training' and training_progress to 0.
 * In a real implementation, this would kick off a background job.
 */
export async function POST(_request: Request, context: RouteContext) {
    try {
        const { id } = await context.params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership and current state
        const { data: existing, error: fetchError } = await supabase
            .from('custom_agents')
            .select('id, status')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !existing) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (existing.status === 'training') {
            return NextResponse.json({ error: 'Agent is already training' }, { status: 409 });
        }

        // Set training status
        const { data: agent, error: updateError } = await supabase
            .from('custom_agents')
            .update({
                status: 'training',
                training_progress: 0,
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('[Agents] Train error:', updateError);
            return NextResponse.json({ error: 'Failed to start training' }, { status: 500 });
        }

        return NextResponse.json({
            message: 'Training started',
            agent,
        });
    } catch (err) {
        console.error('[Agents] Train POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
