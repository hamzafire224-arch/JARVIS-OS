import { NextResponse, type NextRequest } from 'next/server';

/**
 * Allowed origins for CORS requests.
 * Set ALLOWED_ORIGINS env var as a comma-separated list.
 * Default: dashboard URL + localhost for development.
 */
const ALLOWED_ORIGINS = (
    process.env.ALLOWED_ORIGINS ??
    'https://app.letjarvis.com,http://localhost:3000,http://localhost:3001'
).split(',').map(o => o.trim());

function getCorsOrigin(request: NextRequest | Request): string {
    const origin = request.headers.get('origin') ?? '';
    // Return the requesting origin if it's in our allow list, otherwise block
    return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]!;
}

/**
 * Inject CORS headers into a NextResponse.
 */
export function withCors(response: NextResponse, request?: NextRequest | Request): NextResponse {
    const origin = request ? getCorsOrigin(request) : ALLOWED_ORIGINS[0]!;
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    return response;
}

/**
 * Standard OPTIONS preflight response.
 */
export function corsPreflightResponse(request?: NextRequest | Request): NextResponse {
    const origin = request ? getCorsOrigin(request) : ALLOWED_ORIGINS[0]!;
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
