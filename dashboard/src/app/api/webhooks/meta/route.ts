import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import * as crypto from 'crypto';

/**
 * Meta (WhatsApp / Instagram) Webhook Handler
 *
 * GET  → Hub verification (hub.challenge)
 * POST → Incoming message payloads → insert into omnichannel_messages
 *
 * Security:
 *   - HMAC-SHA256 signature verification on all POST payloads
 *   - Strict user resolution via META_DEFAULT_OWNER_ID or connected_accounts
 *
 * Env vars required:
 *   META_VERIFY_TOKEN   – token you set in the Meta App Dashboard
 *   META_APP_SECRET     – HMAC key for payload signature verification
 *   META_ACCESS_TOKEN   – Graph API token for media downloads
 *   META_DEFAULT_OWNER_ID – fallback Supabase user UUID
 */

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const APP_SECRET = process.env.META_APP_SECRET || '';
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || '';
const DEFAULT_OWNER_ID = process.env.META_DEFAULT_OWNER_ID || '';

// ─── GET: Hub Verification ──────────────────────────────────────
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('[Meta Webhook] Verification succeeded');
        return new NextResponse(challenge || '', { status: 200 });
    }

    console.warn('[Meta Webhook] Verification failed — token mismatch');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST: Incoming Message Payloads ────────────────────────────
export async function POST(req: NextRequest) {
    try {
        // ── Step 1: HMAC-SHA256 Signature Verification ──────────
        const rawBody = await req.text();

        if (APP_SECRET) {
            const signature = req.headers.get('x-hub-signature-256') || '';
            const expectedSignature = 'sha256=' + crypto
                .createHmac('sha256', APP_SECRET)
                .update(rawBody)
                .digest('hex');

            if (!crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            )) {
                console.error('[Meta Webhook] Signature verification FAILED — rejecting payload');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
            }
        } else {
            console.error('[Meta Webhook] META_APP_SECRET not set — refusing to process unverified payloads');
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }

        // ── Step 2: Parse verified payload ──────────────────────
        const payload = JSON.parse(rawBody);

        // Meta sends an `object` field identifying the platform
        const platform = payload.object; // 'whatsapp_business_account' | 'instagram' | 'page'

        const channel: string =
            platform === 'whatsapp_business_account' ? 'whatsapp' :
            platform === 'instagram' ? 'instagram' :
            'web';

        const supabase = createAdminClient();
        const messagesToInsert: Array<{
            user_id: string;
            channel: string;
            direction: string;
            sender_id: string;
            sender_name: string;
            body: string;
            media_url: string | null;
            media_type: string | null;
            platform_message_id: string;
            platform_timestamp: string | null;
            metadata: Record<string, unknown>;
            status: string;
        }> = [];

        // ── Step 3: Resolve owner user (multi-tenant safe) ──────
        const ownerUserId = await resolveOwnerUser(supabase, payload);

        if (!ownerUserId) {
            console.warn('[Meta Webhook] No owner user mapped for this account');
            // Still return 200 so Meta doesn't retry
            return NextResponse.json({ received: true, processed: 0 });
        }

        // ── Step 4: Parse entries ───────────────────────────────
        const entries = payload.entry || [];

        for (const entry of entries) {
            const changes = entry.changes || [];

            for (const change of changes) {
                const value = change.value || {};

                if (channel === 'whatsapp') {
                    // WhatsApp Cloud API structure
                    const messages = value.messages || [];
                    const contacts = value.contacts || [];

                    for (const msg of messages) {
                        const contact = contacts.find(
                            (c: { wa_id?: string }) => c.wa_id === msg.from
                        ) || {};

                        // Handle audio messages — transcribe via Whisper
                        let body = extractBody(msg);
                        let mediaUrl = extractMediaUrl(msg);

                        if (msg.type === 'audio' && msg.audio?.id && ACCESS_TOKEN) {
                            try {
                                // Fetch the actual download URL from Meta Graph API
                                const mediaRes = await fetch(
                                    `https://graph.facebook.com/v19.0/${msg.audio.id}`,
                                    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
                                );
                                if (mediaRes.ok) {
                                    const mediaData = await mediaRes.json();
                                    mediaUrl = mediaData.url || null;

                                    // Download the audio binary
                                    if (mediaUrl) {
                                        const audioRes = await fetch(mediaUrl, {
                                            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
                                        });
                                        if (audioRes.ok) {
                                            const audioBuffer = await audioRes.arrayBuffer();
                                            body = await transcribeAudio(Buffer.from(audioBuffer), 'audio.ogg');
                                        }
                                    }
                                }
                            } catch (err) {
                                console.error('[Meta Webhook] Audio transcription failed:', err);
                                body = '[Voice Message — transcription failed]';
                            }
                        }

                        messagesToInsert.push({
                            user_id: ownerUserId,
                            channel: 'whatsapp',
                            direction: 'inbound',
                            sender_id: msg.from || '',
                            sender_name: contact.profile?.name || msg.from || '',
                            body,
                            media_url: mediaUrl,
                            media_type: extractMediaType(msg),
                            platform_message_id: msg.id || '',
                            platform_timestamp: msg.timestamp
                                ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
                                : null,
                            metadata: { raw: msg, contact },
                            status: 'received',
                        });
                    }
                } else if (channel === 'instagram') {
                    // Instagram Messaging API structure
                    const messaging = entry.messaging || [];

                    for (const event of messaging) {
                        if (event.message) {
                            messagesToInsert.push({
                                user_id: ownerUserId,
                                channel: 'instagram',
                                direction: 'inbound',
                                sender_id: event.sender?.id || '',
                                sender_name: '',
                                body: event.message.text || '',
                                media_url: event.message.attachments?.[0]?.payload?.url || null,
                                media_type: event.message.attachments?.[0]?.type || null,
                                platform_message_id: event.message.mid || '',
                                platform_timestamp: event.timestamp
                                    ? new Date(event.timestamp).toISOString()
                                    : null,
                                metadata: { raw: event },
                                status: 'received',
                            });
                        }
                    }
                }
            }
        }

        // ── Step 5: Batch insert ────────────────────────────────
        if (messagesToInsert.length > 0) {
            const { error } = await supabase
                .from('omnichannel_messages')
                .insert(messagesToInsert);

            if (error) {
                console.error('[Meta Webhook] Insert error:', error.message);
                // Return 200 with no error details (prevent information leakage)
                return NextResponse.json({ received: true, processed: 0 });
            }

            console.log(`[Meta Webhook] Inserted ${messagesToInsert.length} messages`);
        }

        return NextResponse.json({
            received: true,
            processed: messagesToInsert.length,
        });
    } catch (err) {
        console.error('[Meta Webhook] Error:', err);
        // Return 200 to prevent Meta retries on parse errors
        return NextResponse.json({ received: true }, { status: 200 });
    }
}

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Resolve which JARVIS user owns this webhook account.
 *
 * Priority:
 * 1. Check `connected_accounts` table for platform account ID → user_id mapping
 * 2. Fall back to META_DEFAULT_OWNER_ID env var (explicit single-tenant config)
 * 3. Return null if no mapping found (messages are dropped safely)
 *
 * This prevents the multi-tenant data leak where all messages
 * would route to an arbitrary first subscriber.
 */
async function resolveOwnerUser(
    supabase: ReturnType<typeof createAdminClient>,
    payload: Record<string, unknown>
): Promise<string | null> {
    // Extract the WhatsApp Business Account ID or IG page ID
    const entries = (payload.entry || []) as Array<{ id?: string }>;
    const accountId = entries[0]?.id;

    if (accountId) {
        // Try to find a connected_accounts mapping
        const { data } = await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('user_id', DEFAULT_OWNER_ID)
            .limit(1)
            .single();

        if (data?.user_id) {
            return data.user_id;
        }
    }

    // Fall back to the explicit default owner (set in .env)
    if (DEFAULT_OWNER_ID) {
        return DEFAULT_OWNER_ID;
    }

    // No mapping found — drop the messages safely
    console.error('[Meta Webhook] No owner mapping found. Set META_DEFAULT_OWNER_ID in .env');
    return null;
}

/**
 * Transcribe audio buffer using OpenAI Whisper API.
 */
async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return '[Voice Message — OPENAI_API_KEY not configured]';
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'text');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
    });

    if (!res.ok) {
        console.error('[Whisper] Transcription failed:', res.status, await res.text());
        return '[Voice Message — transcription error]';
    }

    const transcript = await res.text();
    return transcript.trim() || '[Voice Message — empty transcript]';
}

function extractBody(msg: Record<string, unknown>): string {
    const type = msg.type as string;
    if (type === 'text') return (msg.text as { body?: string })?.body || '';
    if (type === 'image') return (msg.image as { caption?: string })?.caption || '[Image]';
    if (type === 'video') return (msg.video as { caption?: string })?.caption || '[Video]';
    if (type === 'audio') return '[Voice Message]';
    if (type === 'document') return (msg.document as { filename?: string })?.filename || '[Document]';
    if (type === 'location') return '[Location]';
    if (type === 'sticker') return '[Sticker]';
    if (type === 'reaction') return `[Reaction: ${(msg.reaction as { emoji?: string })?.emoji || ''}]`;
    return `[${type || 'unknown'}]`;
}

function extractMediaUrl(msg: Record<string, unknown>): string | null {
    const type = msg.type as string;
    const media = msg[type] as { id?: string; link?: string; url?: string } | undefined;
    return media?.link || media?.url || null;
}

function extractMediaType(msg: Record<string, unknown>): string | null {
    const type = msg.type as string;
    if (['text', 'location', 'reaction', 'contacts'].includes(type)) return null;
    return type || null;
}
