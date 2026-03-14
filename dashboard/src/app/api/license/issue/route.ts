import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { withCors, corsPreflightResponse } from '@/lib/cors';

export async function OPTIONS() {
    return corsPreflightResponse();
}

export async function POST(request: Request) {
    try {
        const { user_id } = await request.json();

        if (!user_id) {
            return withCors(NextResponse.json({ error: 'user_id required' }, { status: 400 }));
        }

        const supabase = await createClient();

        // Verify user exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, variant')
            .eq('id', user_id)
            .single();

        if (!profile) {
            return withCors(NextResponse.json({ error: 'User not found' }, { status: 404 }));
        }

        // Check for existing active license
        const { data: existing } = await supabase
            .from('licenses')
            .select('license_key')
            .eq('user_id', user_id)
            .eq('is_active', true)
            .single();

        if (existing) {
            return withCors(NextResponse.json({
                license_key: existing.license_key,
                message: 'Existing license returned',
            }));
        }

        // Generate new license key: pj_{variant}_{uuid}
        const variant = profile.variant || 'balanced';
        const licenseKey = `pj_${variant}_${randomUUID().replace(/-/g, '')}`;

        const { error: insertError } = await supabase
            .from('licenses')
            .insert({
                user_id,
                license_key: licenseKey,
                variant,
                is_active: true,
                last_validated_at: new Date().toISOString(),
            });

        if (insertError) {
            console.error('License insert error:', insertError);
            return withCors(NextResponse.json({ error: 'Failed to create license' }, { status: 500 }));
        }

        return withCors(NextResponse.json({
            license_key: licenseKey,
            variant,
            message: 'License created successfully',
        }));
    } catch (err) {
        console.error('License issue error:', err);
        return withCors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
    }
}
