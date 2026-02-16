import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const email = searchParams.get('email');

    if (!userId) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!storeId || !variantId) {
        return NextResponse.json(
            { error: 'LemonSqueezy not configured' },
            { status: 500 }
        );
    }

    // Build LemonSqueezy checkout URL
    const checkoutUrl = new URL(`https://personaljarvis.lemonsqueezy.com/checkout/buy/${variantId}`);

    // Pass user metadata so webhook can link payment → user
    checkoutUrl.searchParams.set('checkout[custom][user_id]', userId);
    if (email) {
        checkoutUrl.searchParams.set('checkout[email]', email);
    }
    checkoutUrl.searchParams.set('checkout[success_url]', `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`);

    return NextResponse.redirect(checkoutUrl.toString());
}
