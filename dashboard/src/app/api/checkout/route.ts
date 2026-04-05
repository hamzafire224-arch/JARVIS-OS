import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const email = searchParams.get('email');

    if (!userId) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

    if (!apiKey || !storeId || !variantId) {
        return NextResponse.json(
            { error: 'LemonSqueezy not configured' },
            { status: 500 }
        );
    }

    try {
        // Use LemonSqueezy API to create a dynamic checkout session
        const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json',
            },
            body: JSON.stringify({
                data: {
                    type: 'checkouts',
                    attributes: {
                        checkout_data: {
                            custom: { user_id: userId },
                            ...(email ? { email } : {}),
                        },
                        product_options: {
                            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.letjarvis.com'}/dashboard/billing?success=true`,
                        },
                    },
                    relationships: {
                        store: {
                            data: { type: 'stores', id: storeId },
                        },
                        variant: {
                            data: { type: 'variants', id: variantId },
                        },
                    },
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[Checkout] LemonSqueezy API error:', response.status, errorBody);
            return NextResponse.json(
                { error: 'Failed to create checkout session' },
                { status: 502 }
            );
        }

        const checkout = await response.json();
        const checkoutUrl = checkout.data?.attributes?.url;

        if (!checkoutUrl) {
            console.error('[Checkout] No URL in checkout response:', JSON.stringify(checkout));
            return NextResponse.json(
                { error: 'Invalid checkout response' },
                { status: 502 }
            );
        }

        return NextResponse.redirect(checkoutUrl);
    } catch (err) {
        console.error('[Checkout] Error creating checkout:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
