import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Market Research API
 *
 * GET  → Fetch competitors, market gaps, pricing snapshots, reports
 * POST → Add a competitor or market gap
 */

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'overview';

        if (type === 'competitors') {
            const { data, error } = await supabase
                .from('competitors')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ competitors: data || [] });
        }

        if (type === 'gaps') {
            const { data, error } = await supabase
                .from('market_gaps')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return NextResponse.json({ gaps: data || [] });
        }

        if (type === 'pricing') {
            const competitorId = searchParams.get('competitor_id');
            let query = supabase
                .from('pricing_snapshots')
                .select('*, competitors(name)')
                .eq('user_id', user.id)
                .order('captured_at', { ascending: false })
                .limit(50);

            if (competitorId) {
                query = query.eq('competitor_id', competitorId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return NextResponse.json({ snapshots: data || [] });
        }

        if (type === 'reports') {
            const { data, error } = await supabase
                .from('research_reports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return NextResponse.json({ reports: data || [] });
        }

        // Default: overview — aggregate counts
        const [competitorRes, gapRes, pricingRes, reportRes] = await Promise.all([
            supabase.from('competitors').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true),
            supabase.from('market_gaps').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('pricing_snapshots').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            supabase.from('research_reports').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        ]);

        return NextResponse.json({
            overview: {
                competitors: competitorRes.count ?? 0,
                gaps: gapRes.count ?? 0,
                pricingSnapshots: pricingRes.count ?? 0,
                reports: reportRes.count ?? 0,
            },
        });
    } catch (err) {
        console.error('[Research API] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const type = body.type || 'competitor';

        if (type === 'competitor') {
            const { data, error } = await supabase
                .from('competitors')
                .insert({
                    user_id: user.id,
                    name: body.name || 'Unnamed',
                    website_url: body.website_url || null,
                    social_handles: body.social_handles || {},
                    industry: body.industry || '',
                    notes: body.notes || '',
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ competitor: data }, { status: 201 });
        }

        if (type === 'gap') {
            const { data, error } = await supabase
                .from('market_gaps')
                .insert({
                    user_id: user.id,
                    opportunity_name: body.opportunity_name || 'Unnamed Opportunity',
                    tam_estimate: body.tam_estimate || null,
                    nps_score: body.nps_score ?? null,
                    segment: body.segment || '',
                    gap_description: body.gap_description || '',
                    strategy_notes: body.strategy_notes || '',
                    priority: body.priority || 'medium',
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ gap: data }, { status: 201 });
        }

        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    } catch (err) {
        console.error('[Research API] Error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
