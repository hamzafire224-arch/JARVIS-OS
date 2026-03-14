import { NextResponse } from 'next/server';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Inject CORS headers into a NextResponse.
 */
export function withCors(response: NextResponse): NextResponse {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

/**
 * Standard OPTIONS preflight response.
 */
export function corsPreflightResponse(): NextResponse {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
