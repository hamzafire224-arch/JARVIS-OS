/**
 * JARVIS WhatsApp Business Adapter
 * 
 * Enables JARVIS access via WhatsApp using Meta Cloud API.
 * Features:
 * - Message handling with conversation context
 * - Media message support (images, documents, voice)
 * - Template messages for notifications
 * - Interactive buttons and lists
 * - Webhook-based message reception
 * - Rate limiting and phone number verification
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhatsAppConfig {
    /** WhatsApp Business Account phone number ID */
    phoneNumberId: string;
    /** Access token from Meta Developer Console */
    accessToken: string;
    /** Webhook verify token (for webhook setup) */
    webhookVerifyToken: string;
    /** Allowed phone numbers (empty = allow all) */
    allowedNumbers?: string[];
    /** Rate limit: max messages per minute per user */
    rateLimitPerMinute?: number;
    /** API version */
    apiVersion?: string;
}

export interface WhatsAppMessage {
    messageId: string;
    phoneNumber: string;
    displayName?: string;
    text?: string;
    type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'interactive' | 'button';
    mediaId?: string;
    mediaUrl?: string;
    caption?: string;
    buttonPayload?: string;
    listReplyId?: string;
    timestamp: Date;
}

export interface WhatsAppContact {
    phoneNumber: string;
    displayName?: string;
    messageCount: number;
    lastMessage: Date;
    conversationId?: string;
}

export type WhatsAppMessageHandler = (message: WhatsAppMessage) => Promise<string | void>;

// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Business Adapter
// ═══════════════════════════════════════════════════════════════════════════════

export class WhatsAppAdapter extends EventEmitter {
    private config: Required<Omit<WhatsAppConfig, 'allowedNumbers'>> & { allowedNumbers: string[] };
    private isRunning: boolean = false;
    private contacts: Map<string, WhatsAppContact> = new Map();
    private messageHandlers: WhatsAppMessageHandler[] = [];
    private rateLimitStore: Map<string, number[]> = new Map(); // phoneNumber -> timestamps
    private baseUrl: string;

    constructor(config: WhatsAppConfig) {
        super();

        this.config = {
            phoneNumberId: config.phoneNumberId,
            accessToken: config.accessToken,
            webhookVerifyToken: config.webhookVerifyToken,
            allowedNumbers: config.allowedNumbers ?? [],
            rateLimitPerMinute: config.rateLimitPerMinute ?? 30,
            apiVersion: config.apiVersion ?? 'v18.0',
        };

        this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the WhatsApp adapter
     * Note: WhatsApp uses webhooks, so this just marks the adapter as ready
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('WhatsApp adapter already running');
            return;
        }

        // Verify credentials by getting phone number info
        const phoneInfo = await this.callApi('GET', `/${this.config.phoneNumberId}`);

        if (phoneInfo.error) {
            throw new Error(`Invalid WhatsApp credentials: ${(phoneInfo.error as { message?: string })?.message ?? 'Unknown error'}`);
        }

        logger.gateway('WhatsApp adapter connected', {
            phoneNumber: phoneInfo.display_phone_number,
            verifiedName: phoneInfo.verified_name,
        });

        this.isRunning = true;
        this.emit('started', phoneInfo);
    }

    /**
     * Stop the WhatsApp adapter
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;
        logger.gateway('WhatsApp adapter stopped');
        this.emit('stopped');
    }

    /**
     * Check if adapter is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Webhook Handling
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Handle webhook verification (GET request from Meta)
     */
    handleWebhookVerification(
        mode: string,
        token: string,
        challenge: string
    ): { status: number; body: string } {
        if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
            logger.gateway('WhatsApp webhook verified');
            return { status: 200, body: challenge };
        }
        return { status: 403, body: 'Verification failed' };
    }

    /**
     * Handle incoming webhook (POST request from Meta)
     */
    async handleWebhook(body: unknown): Promise<void> {
        const data = body as Record<string, unknown>;

        if (data.object !== 'whatsapp_business_account') {
            return;
        }

        const entries = data.entry as Array<Record<string, unknown>>;
        if (!entries?.length) return;

        for (const entry of entries) {
            const changes = entry.changes as Array<Record<string, unknown>>;
            if (!changes?.length) continue;

            for (const change of changes) {
                if (change.field !== 'messages') continue;

                const value = change.value as Record<string, unknown>;
                const messages = value.messages as Array<Record<string, unknown>>;
                const contacts = value.contacts as Array<Record<string, unknown>>;

                if (!messages?.length) continue;

                for (const msg of messages) {
                    const contact = contacts?.find(
                        (c) => (c as Record<string, unknown>).wa_id === msg.from
                    ) as Record<string, unknown> | undefined;

                    await this.handleIncomingMessage(msg, contact);
                }
            }
        }
    }

    private async handleIncomingMessage(
        rawMessage: Record<string, unknown>,
        contact?: Record<string, unknown>
    ): Promise<void> {
        const phoneNumber = rawMessage.from as string;
        const messageType = rawMessage.type as string;

        const message: WhatsAppMessage = {
            messageId: rawMessage.id as string,
            phoneNumber,
            displayName: (contact?.profile as Record<string, unknown>)?.name as string | undefined,
            type: messageType as WhatsAppMessage['type'],
            timestamp: new Date(parseInt(rawMessage.timestamp as string) * 1000),
        };

        // Extract content based on message type
        switch (messageType) {
            case 'text':
                message.text = (rawMessage.text as Record<string, unknown>).body as string;
                break;
            case 'image':
            case 'document':
            case 'audio':
            case 'video':
            case 'sticker':
                const media = rawMessage[messageType] as Record<string, unknown>;
                message.mediaId = media.id as string;
                message.caption = media.caption as string | undefined;
                break;
            case 'interactive':
                const interactive = rawMessage.interactive as Record<string, unknown>;
                const interactiveType = interactive.type as string;
                if (interactiveType === 'button_reply') {
                    message.buttonPayload = (interactive.button_reply as Record<string, unknown>).id as string;
                    message.text = (interactive.button_reply as Record<string, unknown>).title as string;
                } else if (interactiveType === 'list_reply') {
                    message.listReplyId = (interactive.list_reply as Record<string, unknown>).id as string;
                    message.text = (interactive.list_reply as Record<string, unknown>).title as string;
                }
                break;
            case 'button':
                message.text = (rawMessage.button as Record<string, unknown>).text as string;
                message.buttonPayload = (rawMessage.button as Record<string, unknown>).payload as string;
                break;
        }

        // Authorization check
        if (!this.isAuthorized(phoneNumber)) {
            logger.warn('Unauthorized WhatsApp user', { phoneNumber });
            await this.sendMessage(phoneNumber, '⛔ You are not authorized to use this service.');
            return;
        }

        // Rate limiting
        if (!this.checkRateLimit(phoneNumber)) {
            await this.sendMessage(phoneNumber, '⏳ You are sending messages too quickly. Please wait a moment.');
            return;
        }

        // Track contact
        this.trackContact(message);

        // Emit event
        this.emit('message', message);

        // Mark message as read
        await this.markAsRead(message.messageId);

        // Handle text messages
        if (message.text) {
            for (const handler of this.messageHandlers) {
                try {
                    const response = await handler(message);
                    if (response) {
                        await this.sendMessage(phoneNumber, response);
                        break;
                    }
                } catch (error) {
                    logger.error('WhatsApp message handler error', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    await this.sendMessage(phoneNumber, '❌ An error occurred processing your message.');
                }
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Handler Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a message handler
     */
    onMessage(handler: WhatsAppMessageHandler): void {
        this.messageHandlers.push(handler);
    }

    /**
     * Clear all handlers
     */
    clearHandlers(): void {
        this.messageHandlers = [];
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Messaging
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Send a text message
     */
    async sendMessage(to: string, text: string): Promise<boolean> {
        // Split long messages (WhatsApp limit is 4096 chars)
        const chunks = this.splitMessage(text, 4000);

        for (const chunk of chunks) {
            const result = await this.callApi('POST', `/${this.config.phoneNumberId}/messages`, {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to,
                type: 'text',
                text: { body: chunk },
            });

            if (result.error) {
                logger.error('Failed to send WhatsApp message', {
                    to,
                    error: (result.error as { message?: string })?.message ?? 'Unknown error',
                });
                return false;
            }
        }

        return true;
    }

    /**
     * Send a message with buttons (max 3 buttons)
     */
    async sendWithButtons(
        to: string,
        bodyText: string,
        buttons: { id: string; title: string }[]
    ): Promise<boolean> {
        const result = await this.callApi('POST', `/${this.config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                    buttons: buttons.slice(0, 3).map((btn) => ({
                        type: 'reply',
                        reply: { id: btn.id, title: btn.title.slice(0, 20) },
                    })),
                },
            },
        });

        return !result.error;
    }

    /**
     * Send a message with a list (menu)
     */
    async sendWithList(
        to: string,
        bodyText: string,
        buttonText: string,
        sections: {
            title: string;
            rows: { id: string; title: string; description?: string }[];
        }[]
    ): Promise<boolean> {
        const result = await this.callApi('POST', `/${this.config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'interactive',
            interactive: {
                type: 'list',
                body: { text: bodyText },
                action: {
                    button: buttonText,
                    sections,
                },
            },
        });

        return !result.error;
    }

    /**
     * Send a template message (for notifications, requires pre-approved templates)
     */
    async sendTemplate(
        to: string,
        templateName: string,
        languageCode: string = 'en',
        components?: unknown[]
    ): Promise<boolean> {
        const result = await this.callApi('POST', `/${this.config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        });

        return !result.error;
    }

    /**
     * Mark a message as read
     */
    async markAsRead(messageId: string): Promise<void> {
        await this.callApi('POST', `/${this.config.phoneNumberId}/messages`, {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        });
    }

    /**
     * Download media (returns URL)
     */
    async getMediaUrl(mediaId: string): Promise<string | null> {
        const result = await this.callApi('GET', `/${mediaId}`);
        return (result.url as string) ?? null;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Authorization & Rate Limiting
    // ─────────────────────────────────────────────────────────────────────────────

    private isAuthorized(phoneNumber: string): boolean {
        if (this.config.allowedNumbers.length === 0) {
            return true;
        }
        // Normalize phone number for comparison
        const normalized = phoneNumber.replace(/\D/g, '');
        return this.config.allowedNumbers.some((n) => n.replace(/\D/g, '') === normalized);
    }

    private checkRateLimit(phoneNumber: string): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        let timestamps = this.rateLimitStore.get(phoneNumber) ?? [];
        timestamps = timestamps.filter((t) => t > oneMinuteAgo);

        if (timestamps.length >= this.config.rateLimitPerMinute) {
            return false;
        }

        timestamps.push(now);
        this.rateLimitStore.set(phoneNumber, timestamps);

        return true;
    }

    private trackContact(message: WhatsAppMessage): void {
        const existing = this.contacts.get(message.phoneNumber);

        this.contacts.set(message.phoneNumber, {
            phoneNumber: message.phoneNumber,
            displayName: message.displayName ?? existing?.displayName,
            messageCount: (existing?.messageCount ?? 0) + 1,
            lastMessage: message.timestamp,
            conversationId: existing?.conversationId,
        });
    }

    /**
     * Get contact info
     */
    getContact(phoneNumber: string): WhatsAppContact | undefined {
        return this.contacts.get(phoneNumber);
    }

    /**
     * Set conversation ID for a contact (for context tracking)
     */
    setContactConversation(phoneNumber: string, conversationId: string): void {
        const contact = this.contacts.get(phoneNumber);
        if (contact) {
            contact.conversationId = conversationId;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // API Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private async callApi(
        method: 'GET' | 'POST',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            return await response.json() as Record<string, unknown>;
        } catch (error) {
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Network error',
                },
            };
        }
    }

    private splitMessage(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) {
            return [text];
        }

        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > 0) {
            if (remaining.length <= maxLength) {
                chunks.push(remaining);
                break;
            }

            let breakPoint = remaining.lastIndexOf('\n', maxLength);
            if (breakPoint === -1 || breakPoint < maxLength / 2) {
                breakPoint = remaining.lastIndexOf(' ', maxLength);
            }
            if (breakPoint === -1 || breakPoint < maxLength / 2) {
                breakPoint = maxLength;
            }

            chunks.push(remaining.slice(0, breakPoint));
            remaining = remaining.slice(breakPoint).trim();
        }

        return chunks;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

let whatsappInstance: WhatsAppAdapter | null = null;

export function getWhatsAppAdapter(): WhatsAppAdapter | null {
    return whatsappInstance;
}

export function createWhatsAppAdapter(config: WhatsAppConfig): WhatsAppAdapter {
    if (whatsappInstance) {
        whatsappInstance.stop();
    }
    whatsappInstance = new WhatsAppAdapter(config);
    return whatsappInstance;
}

export function resetWhatsAppAdapter(): void {
    if (whatsappInstance) {
        whatsappInstance.stop();
        whatsappInstance = null;
    }
}
