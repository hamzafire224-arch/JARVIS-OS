import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/marketplace/skills — List marketplace skills
 * Query params: ?category=development (optional filter)
 */
export async function GET(request: Request) {
    try {
        const supabase = await createClient();

        // SECURITY: Verify authenticated session before serving marketplace data
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');

        // Fetch DB skills
        let query = supabase
            .from('marketplace_skills')
            .select('*')
            .order('downloads', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data: dbSkills, error } = await query;

        if (error) {
            console.error('[Marketplace] List error:', error);
            // Don't fail entirely — still return featured skills
        }

        // Fetch featured skills
        let featuredQuery = supabase
            .from('marketplace_skills')
            .select('*')
            .eq('featured', true)
            .order('downloads', { ascending: false });

        if (category) {
            featuredQuery = featuredQuery.eq('category', category);
        }

        const { data: dbFeatured, error: featuredError } = await featuredQuery;

        if (featuredError) {
            console.error('[Marketplace] Featured list error:', featuredError);
        }

        const filteredFeatured = dbFeatured ?? [];

        // Merge: featured first, then DB skills appended (excluding featured to avoid duplicates)
        const skills = [
            ...filteredFeatured,
            ...(dbSkills?.filter(s => !s.featured) ?? [])
        ];

        return NextResponse.json({
            skills,
            featured: filteredFeatured,
            total: skills.length,
        });
    } catch (err) {
        console.error('[Marketplace] GET error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
