import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

// Verify LemonSqueezy webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('x-signature') || '';
        const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';

        // Verify webhook signature
        if (webhookSecret && signature) {
            if (!verifySignature(rawBody, signature, webhookSecret)) {
                console.error('Invalid webhook signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const payload = JSON.parse(rawBody);
        const eventName = payload.meta?.event_name;
        const customData = payload.meta?.custom_data || {};
        const userId = customData.user_id;
        const attrs = payload.data?.attributes || {};

        console.log(`[Webhook] ${eventName} for user ${userId}`);

        if (!userId) {
            console.error('No user_id in webhook custom_data');
            return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
        }

        const supabase = await createClient();

        switch (eventName) {
            case 'subscription_created': {
                // Create or update subscription
                await supabase.from('subscriptions').upsert({
                    user_id: userId,
                    lemon_subscription_id: String(payload.data.id),
                    lemon_customer_id: String(attrs.customer_id),
                    plan: 'productivity',
                    status: 'active',
                    current_period_start: attrs.renews_at ? new Date().toISOString() : null,
                    current_period_end: attrs.renews_at || null,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

                // Update profile variant
                await supabase
                    .from('profiles')
                    .update({ variant: 'productivity', updated_at: new Date().toISOString() })
                    .eq('id', userId);

                // Update existing license variant
                await supabase
                    .from('licenses')
                    .update({ variant: 'productivity' })
                    .eq('user_id', userId)
                    .eq('is_active', true);

                console.log(`[Webhook] User ${userId} upgraded to Productivity`);
                break;
            }

            case 'subscription_updated': {
                const status = attrs.status === 'active' ? 'active'
                    : attrs.status === 'past_due' ? 'past_due'
                        : attrs.status === 'cancelled' ? 'cancelled'
                            : 'expired';

                await supabase
                    .from('subscriptions')
                    .update({
                        status,
                        current_period_end: attrs.renews_at || attrs.ends_at || null,
                        cancel_at: attrs.ends_at || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[Webhook] User ${userId} subscription status → ${status}`);
                break;
            }

            case 'subscription_payment_success': {
                // Extend subscription period
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'active',
                        current_period_end: attrs.renews_at || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[Webhook] User ${userId} payment successful`);
                break;
            }

            case 'subscription_payment_failed': {
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'past_due',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[Webhook] User ${userId} payment FAILED → past_due`);
                break;
            }

            case 'subscription_cancelled': {
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'cancelled',
                        cancel_at: attrs.ends_at || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[Webhook] User ${userId} subscription cancelled`);
                break;
            }

            case 'subscription_expired': {
                // Downgrade to balanced
                await supabase
                    .from('subscriptions')
                    .update({
                        status: 'expired',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                await supabase
                    .from('profiles')
                    .update({ variant: 'balanced', updated_at: new Date().toISOString() })
                    .eq('id', userId);

                await supabase
                    .from('licenses')
                    .update({ variant: 'balanced' })
                    .eq('user_id', userId)
                    .eq('is_active', true);

                console.log(`[Webhook] User ${userId} subscription expired → downgraded to Balanced`);
                break;
            }

            default:
                console.log(`[Webhook] Unhandled event: ${eventName}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
