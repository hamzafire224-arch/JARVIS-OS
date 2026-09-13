/**
 * JARVIS SaaS Billing System
 *
 * Integrates natively with LemonSqueezy webhooks to determine user subscription tiers.
 * This file gates advanced JARVIS capabilities (Cloud Agents, Screen Use) based on active
 * subscriptions.
 */

import crypto from 'crypto';
import { logger } from '../utils/logger.js';
import { getSupabaseAdmin } from '../db/SupabaseClient.js';

export interface SubscriptionStatus {
    isActive: boolean;
    tier: 'free' | 'pro' | 'enterprise';
    renewsAt?: string;
}

export class LemonSqueezyManager {
    private secret: string;

    constructor() {
        this.secret = process.env['LEMONSQUEEZY_WEBHOOK_SECRET'] || '';
    }

    /**
     * Verifies the signature of incoming LemonSqueezy webhook requests autonomously.
     */
    public verifyWebhook(payload: string, signature: string): boolean {
        if (!this.secret) return false;
        const hmac = crypto.createHmac('sha256', this.secret);
        const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
        const signatureBuffer = Buffer.from(signature, 'utf8');
        
        try {
            return crypto.timingSafeEqual(digest, signatureBuffer);
        } catch {
            return false;
        }
    }

    /**
     * Checks if a JARVIS user is actively subscribed and what tier they are on.
     * Looks up natively in the Supabase instance since the LemonSqueezy webhook pushes data there!
     */
    public async checkUserSubscription(userId: string): Promise<SubscriptionStatus> {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            // If offline, act strictly as free tier or check local fallback if wanted
            return { isActive: false, tier: 'free' };
        }

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('status, plan, current_period_end')
                .eq('user_id', userId)
                .single();

            if (error || !data) {
                return { isActive: false, tier: 'free' };
            }

            const tierMap: Record<string, 'free' | 'pro' | 'enterprise'> = {
                balanced: 'free',
                productivity: 'pro',
                enterprise: 'enterprise',
            };

            return {
                isActive: data.status === 'active',
                tier: tierMap[data.plan] ?? 'free',
                renewsAt: data.current_period_end
            };
        } catch (err) {
            logger.warn('Failed to verify user subscription', { error: String(err) });
            return { isActive: false, tier: 'free' };
        }
    }
}

let instance: LemonSqueezyManager | null = null;

export function getLemonSqueezyManager(): LemonSqueezyManager {
    if (!instance) {
        instance = new LemonSqueezyManager();
    }
    return instance;
}
