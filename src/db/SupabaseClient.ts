/**
 * JARVIS SaaS Database Integration
 *
 * Dual Supabase Client architecture:
 * - **Admin Client** (service role key): For server-side operations only —
 *   webhooks, license validation, subscription management. Bypasses RLS.
 * - **Public Client** (anon key): For client-facing operations —
 *   user data access, memory sync. Respects Row-Level Security.
 *
 * ⚠️ SECURITY: Never expose the admin client to client-facing surfaces.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Public Client (anon key — respects RLS)
// ═══════════════════════════════════════════════════════════════════════════════

let publicInstance: SupabaseClient | null = null;
let publicInitialized = false;

/**
 * Get the public Supabase client (uses anon key, respects RLS).
 * Use this for all client-facing operations: user data, memory sync, etc.
 */
export function getSupabaseClient(): SupabaseClient | null {
    if (publicInitialized) return publicInstance;

    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_ANON_KEY'] ?? process.env['SUPABASE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        logger.warn('Supabase URL or Anon Key not found. Falling back to local offline functionality.');
        publicInitialized = true;
        return null;
    }

    try {
        publicInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
        logger.info('Supabase public client initialized (RLS enforced)');
    } catch (err) {
        logger.error('Failed to initialize Supabase public client:', { error: String(err) });
        publicInstance = null;
    }

    publicInitialized = true;
    return publicInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Client (service role key — bypasses RLS)
// ═══════════════════════════════════════════════════════════════════════════════

let adminInstance: SupabaseClient | null = null;
let adminInitialized = false;

/**
 * Get the admin Supabase client (uses service role key, bypasses RLS).
 * ⚠️ SERVER-ONLY: Use this exclusively for webhook handlers, license
 * validation, subscription management, and other trusted server operations.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
    if (adminInitialized) return adminInstance;

    const supabaseUrl = process.env['SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !serviceRoleKey) {
        logger.warn('Supabase service role key not found. Admin operations unavailable.');
        adminInitialized = true;
        return null;
    }

    try {
        adminInstance = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
        logger.info('Supabase admin client initialized (service role — bypasses RLS)');
    } catch (err) {
        logger.error('Failed to initialize Supabase admin client:', { error: String(err) });
        adminInstance = null;
    }

    adminInitialized = true;
    return adminInstance;
}

export function isSupabaseConfigured(): boolean {
    return !!getSupabaseClient();
}
