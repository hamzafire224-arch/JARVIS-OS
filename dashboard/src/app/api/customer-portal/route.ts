import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the LemonSqueezy customer ID from subscriptions
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('lemon_customer_id')
        .eq('user_id', userId)
        .single();

    if (!subscription?.lemon_customer_id) {
        return NextResponse.json(
            { error: 'No active subscription found' },
            { status: 404 }
        );
    }

    // LemonSqueezy customer portal URL
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const portalUrl = `https://personaljarvis.lemonsqueezy.com/billing?customer_id=${subscription.lemon_customer_id}`;

    return NextResponse.redirect(portalUrl);
}
