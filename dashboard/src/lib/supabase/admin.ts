/**
 * Supabase Admin Client (Service Role)
 *
 * Bypasses Row-Level Security for server-side operations that run
 * without a user session, such as:
 *   - LemonSqueezy webhook handlers (no cookies)
 *   - License key issuance
 *   - Background jobs
 *
 * ⚠️ NEVER import this in client components or expose the service role key.
 */

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        throw new Error(
            'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
            'These are required for admin operations.'
        );
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
