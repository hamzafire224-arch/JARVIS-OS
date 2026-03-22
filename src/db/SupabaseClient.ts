/**
 * JARVIS SaaS Database Integration
 *
 * Core Supabase Client configuring the connection to the remote PostgreSQL DB.
 * Used for transitioning JARVIS from a Local MVP to a Commercial Multi-Tenant Product.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

let supabaseInstance: SupabaseClient | null = null;
let isInitialized = false;

export function getSupabaseClient(): SupabaseClient | null {
    if (isInitialized) return supabaseInstance;

    const supabaseUrl = process.env['SUPABASE_URL'];
    const supabaseKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!supabaseUrl || !supabaseKey) {
        logger.warn('Supabase URL or Key not found in environment variables. Falling back to local offline functionality.');
        isInitialized = true;
        return null;
    }

    try {
        supabaseInstance = createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });
        logger.info('Supabase Client successfully initialized for SaaS DB');
    } catch (err) {
        logger.error('Failed to initialize Supabase client:', { error: String(err) });
        supabaseInstance = null;
    }

    isInitialized = true;
    return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
    return !!getSupabaseClient();
}
