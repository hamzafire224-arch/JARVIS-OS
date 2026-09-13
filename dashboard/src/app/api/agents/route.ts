import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/agents — List all custom agents for the authenticated user
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: agents, error } = await supabase
            .from('custom_agents')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Agents] List error:', error);
            return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
        }

        return NextResponse.json({ agents: agents ?? [] });
    } catch (err) {
        console.error('[Agents] GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/agents — Create a new custom agent
 * Body: { name: string, persona?: string, system_prompt?: string, skills?: string[], avatar_emoji?: string }
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, persona, system_prompt, skills, avatar_emoji } = body;

        // Validate name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
        }

        if (name.trim().length > 50) {
            return NextResponse.json({ error: 'Agent name must be 50 characters or less' }, { status: 400 });
        }

        const { data: agent, error } = await supabase
            .from('custom_agents')
            .insert({
                user_id: user.id,
                name: name.trim(),
                persona: persona ?? '',
                system_prompt: system_prompt ?? '',
                skills: Array.isArray(skills) ? skills : [],
                avatar_emoji: avatar_emoji ?? '🤖',
            })
            .select()
            .single();

        if (error) {
            console.error('[Agents] Create error:', error);
            return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
        }

        return NextResponse.json({ agent }, { status: 201 });
    } catch (err) {
        console.error('[Agents] POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
