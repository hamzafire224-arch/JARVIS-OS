import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'LemonSqueezy not configured' }, { status: 500 });
    }

    const supabase = createAdminClient();

    // Get the LemonSqueezy subscription ID from our database
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('lemon_subscription_id, lemon_customer_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.lemon_subscription_id) {
        return NextResponse.json(
            { error: 'No active subscription found' },
            { status: 404 }
        );
    }

    try {
        // Use LemonSqueezy API to get the customer portal URL
        const response = await fetch(
            `https://api.lemonsqueezy.com/v1/subscriptions/${subscription.lemon_subscription_id}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/vnd.api+json',
                },
            }
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Portal] LemonSqueezy API error:', response.status, errorBody);
            return NextResponse.json(
                { error: 'Failed to fetch subscription details' },
                { status: 502 }
            );
        }

        const sub = await response.json();
        const portalUrl = sub.data?.attributes?.urls?.customer_portal;

        if (!portalUrl) {
            console.error('[Portal] No customer_portal URL in response:', JSON.stringify(sub.data?.attributes?.urls));
            return NextResponse.json(
                { error: 'Customer portal URL not available' },
                { status: 502 }
            );
        }

        return NextResponse.redirect(portalUrl);
    } catch (err) {
        console.error('[Portal] Error fetching portal URL:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
