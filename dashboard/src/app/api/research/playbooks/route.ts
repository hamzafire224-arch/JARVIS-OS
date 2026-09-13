import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('market_playbooks')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Map the database rows to the shape expected by the frontend
        const playbooks = (data || []).map(row => ({
            id: row.playbook_id,
            sector: row.sector,
            icon: row.icon,
            tam: row.tam,
            nps: row.nps,
            angle: row.angle,
            gaps: row.gaps,
        }));

        return NextResponse.json({ playbooks });
    } catch (err) {
        console.error('[Research Playbooks API] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
