/**
 * JARVIS Discord Adapter
 * 
 * Enables JARVIS access via Discord bot and webhooks.
 * Features:
 * - Bot mode: full bidirectional communication
 * - Webhook mode: send-only notifications
 * - Slash commands support
 * - Message handling with conversation context
 * - Embed messages for rich formatting
 * - Channel/DM support
 * - Rate limiting and guild authorization
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface DiscordConfig {
    /** Bot token (for bot mode) */
    botToken?: string;
    /** Client/Application ID (for slash commands) */
    clientId?: string;
    /** Webhook URL (for webhook mode) */
    webhookUrl?: string;
    /** Allowed guild IDs (empty = allow all) */
    allowedGuilds?: string[];
    /** Allowed channel IDs (empty = allow all) */
    allowedChannels?: string[];
    /** Rate limit: max messages per minute per user */
    rateLimitPerMinute?: number;
}

export interface DiscordMessage {
    messageId: string;
    channelId: string;
    guildId?: string;
    userId: string;
    username: string;
    discriminator?: string;
    content: string;
    isDM: boolean;
    isMention: boolean;
    replyToMessageId?: string;
    timestamp: Date;
}

export interface DiscordEmbed {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: { text: string };
    timestamp?: string;
}

export interface DiscordUser {
    id: string;
    username: string;
    messageCount: number;
    lastMessage: Date;
    conversationId?: string;
}

export type DiscordMessageHandler = (message: DiscordMessage) => Promise<string | DiscordEmbed | void>;
export type DiscordCommandHandler = (
    interaction: DiscordInteraction
) => Promise<string | DiscordEmbed | void>;

export interface DiscordInteraction {
    id: string;
    token: string;
    commandName: string;
    options: Record<string, unknown>;
    userId: string;
    username: string;
    channelId: string;
    guildId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Discord Adapter
// ═══════════════════════════════════════════════════════════════════════════════

export class DiscordAdapter extends EventEmitter {
    private config: {
        botToken?: string;
        clientId?: string;
        webhookUrl?: string;
        allowedGuilds: string[];
        allowedChannels: string[];
        rateLimitPerMinute: number;
    };
    private isRunning: boolean = false;
    private ws: WebSocket | null = null;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private sessionId: string | null = null;
    private resumeGatewayUrl: string | null = null;
    private sequence: number | null = null;
    private users: Map<string, DiscordUser> = new Map();
    private messageHandlers: DiscordMessageHandler[] = [];
    private commandHandlers: Map<string, DiscordCommandHandler> = new Map();
    private rateLimitStore: Map<string, number[]> = new Map();
    private botUserId: string | null = null;

    private readonly API_BASE = 'https://discord.com/api/v10';
    private readonly GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

    constructor(config: DiscordConfig) {
        super();

        this.config = {
            botToken: config.botToken,
            clientId: config.clientId,
            webhookUrl: config.webhookUrl,
            allowedGuilds: config.allowedGuilds ?? [],
            allowedChannels: config.allowedChannels ?? [],
            rateLimitPerMinute: config.rateLimitPerMinute ?? 30,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the Discord adapter
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Discord adapter already running');
            return;
        }

        if (this.config.botToken) {
            // Bot mode - connect to gateway
            await this.connectGateway();
        } else if (this.config.webhookUrl) {
            // Webhook mode - just mark as ready
            logger.gateway('Discord webhook adapter ready');
        } else {
            throw new Error('Either botToken or webhookUrl is required');
        }

        this.isRunning = true;
        this.emit('started');
    }

    /**
     * Stop the Discord adapter
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.ws) {
            this.ws.close(1000, 'Normal closure');
            this.ws = null;
        }

        logger.gateway('Discord adapter stopped');
        this.emit('stopped');
    }

    /**
     * Check if adapter is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Gateway Connection (Bot Mode)
    // ─────────────────────────────────────────────────────────────────────────────

    private async connectGateway(): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = this.resumeGatewayUrl ?? this.GATEWAY_URL;
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                logger.gateway('Discord gateway connected');
            };

            this.ws.onmessage = (event) => {
                this.handleGatewayMessage(JSON.parse(event.data as string), resolve, reject);
            };

            this.ws.onerror = (error) => {
                logger.error('Discord gateway error', { error: String(error) });
                reject(new Error('Gateway connection failed'));
            };

            this.ws.onclose = (event) => {
                logger.gateway('Discord gateway closed', { code: event.code, reason: event.reason });

                if (this.isRunning && event.code !== 1000) {
                    // Attempt reconnect
                    setTimeout(() => this.connectGateway(), 5000);
                }
            };
        });
    }

    private handleGatewayMessage(
        data: { op: number; d: unknown; s: number | null; t: string | null },
        resolve?: () => void,
        reject?: (err: Error) => void
    ): void {
        // Update sequence
        if (data.s !== null) {
            this.sequence = data.s;
        }

        switch (data.op) {
            case 10: // Hello
                const helloData = data.d as { heartbeat_interval: number };
                this.startHeartbeat(helloData.heartbeat_interval);
                this.identify();
                break;

            case 11: // Heartbeat ACK
                // Connection is healthy
                break;

            case 0: // Dispatch
                this.handleDispatch(data.t!, data.d);
                if (data.t === 'READY' && resolve) {
                    resolve();
                }
                break;

            case 7: // Reconnect
                this.ws?.close(4000, 'Reconnect requested');
                break;

            case 9: // Invalid Session
                const canResume = data.d as boolean;
                if (!canResume) {
                    this.sessionId = null;
                    this.sequence = null;
                }
                setTimeout(() => this.identify(), 5000);
                break;
        }
    }

    private startHeartbeat(interval: number): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        this.heartbeatInterval = setInterval(() => {
            this.ws?.send(JSON.stringify({ op: 1, d: this.sequence }));
        }, interval);

        // Send initial heartbeat
        this.ws?.send(JSON.stringify({ op: 1, d: null }));
    }

    private identify(): void {
        if (this.sessionId && this.sequence !== null) {
            // Resume
            this.ws?.send(JSON.stringify({
                op: 6,
                d: {
                    token: this.config.botToken,
                    session_id: this.sessionId,
                    seq: this.sequence,
                },
            }));
        } else {
            // New identify
            this.ws?.send(JSON.stringify({
                op: 2,
                d: {
                    token: this.config.botToken,
                    intents: 33281, // GUILDS, GUILD_MESSAGES, DIRECT_MESSAGES, MESSAGE_CONTENT
                    properties: {
                        os: 'linux',
                        browser: 'jarvis',
                        device: 'jarvis',
                    },
                },
            }));
        }
    }

    private handleDispatch(event: string, data: unknown): void {
        switch (event) {
            case 'READY':
                const readyData = data as { session_id: string; resume_gateway_url: string; user: { id: string } };
                this.sessionId = readyData.session_id;
                this.resumeGatewayUrl = readyData.resume_gateway_url;
                this.botUserId = readyData.user.id;
                logger.gateway('Discord bot ready', { sessionId: this.sessionId });
                break;

            case 'MESSAGE_CREATE':
                this.handleMessageCreate(data as Record<string, unknown>);
                break;

            case 'INTERACTION_CREATE':
                this.handleInteraction(data as Record<string, unknown>);
                break;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Message Handling
    // ─────────────────────────────────────────────────────────────────────────────

    private async handleMessageCreate(data: Record<string, unknown>): Promise<void> {
        const author = data.author as Record<string, unknown>;

        // Ignore bot messages
        if (author.bot) return;

        // Ignore own messages
        if (author.id === this.botUserId) return;

        const content = data.content as string;
        const guildId = data.guild_id as string | undefined;
        const channelId = data.channel_id as string;

        // Check if we're mentioned
        const mentions = (data.mentions ?? []) as Array<{ id: string }>;
        const isMention = mentions.some(m => m.id === this.botUserId);

        // In guilds, only respond to mentions (unless in allowed channel)
        if (guildId && !isMention && !this.config.allowedChannels.includes(channelId)) {
            return;
        }

        const message: DiscordMessage = {
            messageId: data.id as string,
            channelId,
            guildId,
            userId: author.id as string,
            username: author.username as string,
            discriminator: author.discriminator as string | undefined,
            content: content.replace(/<@!?\d+>/g, '').trim(), // Remove mentions from content
            isDM: !guildId,
            isMention,
            replyToMessageId: (data.message_reference as Record<string, unknown>)?.message_id as string | undefined,
            timestamp: new Date(data.timestamp as string),
        };

        // Authorization check
        if (!this.isAuthorized(guildId, channelId)) {
            return;
        }

        // Rate limiting
        if (!this.checkRateLimit(message.userId)) {
            await this.sendMessage(channelId, '⏳ You are sending messages too quickly. Please wait a moment.');
            return;
        }

        // Track user
        this.trackUser(message);

        // Emit event
        this.emit('message', message);

        // Handle message
        if (message.content) {
            // Show typing
            await this.sendTyping(channelId);

            for (const handler of this.messageHandlers) {
                try {
                    const response = await handler(message);
                    if (response) {
                        if (typeof response === 'string') {
                            await this.sendMessage(channelId, response);
                        } else {
                            await this.sendEmbed(channelId, response);
                        }
                        break;
                    }
                } catch (error) {
                    logger.error('Discord message handler error', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    await this.sendMessage(channelId, '❌ An error occurred processing your message.');
                }
            }
        }
    }

    private async handleInteraction(data: Record<string, unknown>): Promise<void> {
        const type = data.type as number;

        // Only handle application commands (type 2)
        if (type !== 2) return;

        const interactionData = data.data as Record<string, unknown>;
        const user = (data.member as Record<string, unknown>)?.user ?? data.user;

        const interaction: DiscordInteraction = {
            id: data.id as string,
            token: data.token as string,
            commandName: interactionData.name as string,
            options: this.parseOptions((interactionData.options as unknown[]) ?? []),
            userId: (user as Record<string, unknown>).id as string,
            username: (user as Record<string, unknown>).username as string,
            channelId: data.channel_id as string,
            guildId: data.guild_id as string | undefined,
        };

        const handler = this.commandHandlers.get(interaction.commandName);
        if (handler) {
            try {
                const response = await handler(interaction);
                await this.respondToInteraction(interaction, response);
            } catch (error) {
                await this.respondToInteraction(interaction, '❌ An error occurred.');
            }
        } else {
            await this.respondToInteraction(interaction, 'Unknown command.');
        }
    }

    private parseOptions(options: unknown[]): Record<string, unknown> {
        const result: Record<string, unknown> = {};
        for (const opt of options as Array<{ name: string; value: unknown }>) {
            result[opt.name] = opt.value;
        }
        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Handler Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a message handler
     */
    onMessage(handler: DiscordMessageHandler): void {
        this.messageHandlers.push(handler);
    }

    /**
     * Register a slash command handler
     */
    onCommand(command: string, handler: DiscordCommandHandler): void {
        this.commandHandlers.set(command.toLowerCase(), handler);
    }

    /**
     * Clear all handlers
     */
    clearHandlers(): void {
        this.messageHandlers = [];
        this.commandHandlers.clear();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Messaging
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Send a text message
     */
    async sendMessage(channelId: string, content: string): Promise<boolean> {
        // Split long messages (Discord limit is 2000 chars)
        const chunks = this.splitMessage(content, 1900);

        for (const chunk of chunks) {
            const result = await this.callApi('POST', `/channels/${channelId}/messages`, {
                content: chunk,
            });

            if (!result.id) {
                logger.error('Failed to send Discord message', { channelId });
                return false;
            }
        }

        return true;
    }

    /**
     * Send an embed message
     */
    async sendEmbed(channelId: string, embed: DiscordEmbed): Promise<boolean> {
        const result = await this.callApi('POST', `/channels/${channelId}/messages`, {
            embeds: [embed],
        });

        return !!result.id;
    }

    /**
     * Send typing indicator
     */
    async sendTyping(channelId: string): Promise<void> {
        await this.callApi('POST', `/channels/${channelId}/typing`);
    }

    /**
     * Send via webhook (webhook mode)
     */
    async sendWebhook(content: string, options: { username?: string; avatarUrl?: string; embeds?: DiscordEmbed[] } = {}): Promise<boolean> {
        if (!this.config.webhookUrl) {
            throw new Error('Webhook URL not configured');
        }

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    username: options.username ?? 'JARVIS',
                    avatar_url: options.avatarUrl,
                    embeds: options.embeds,
                }),
            });

            return response.ok;
        } catch (error) {
            logger.error('Discord webhook error', {
                error: error instanceof Error ? error.message : String(error),
            });
            return false;
        }
    }

    /**
     * Respond to an interaction
     */
    private async respondToInteraction(
        interaction: DiscordInteraction,
        response: string | DiscordEmbed | void
    ): Promise<void> {
        const data: Record<string, unknown> = { type: 4 };

        if (typeof response === 'string') {
            data.data = { content: response };
        } else if (response) {
            data.data = { embeds: [response] };
        } else {
            data.data = { content: '✅' };
        }

        await this.callApi(
            'POST',
            `/interactions/${interaction.id}/${interaction.token}/callback`,
            data
        );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Authorization & Rate Limiting
    // ─────────────────────────────────────────────────────────────────────────────

    private isAuthorized(guildId?: string, channelId?: string): boolean {
        // Check guild allowlist
        if (guildId && this.config.allowedGuilds.length > 0) {
            if (!this.config.allowedGuilds.includes(guildId)) {
                return false;
            }
        }

        // Check channel allowlist
        if (channelId && this.config.allowedChannels.length > 0) {
            if (!this.config.allowedChannels.includes(channelId)) {
                return false;
            }
        }

        return true;
    }

    private checkRateLimit(userId: string): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        let timestamps = this.rateLimitStore.get(userId) ?? [];
        timestamps = timestamps.filter(t => t > oneMinuteAgo);

        if (timestamps.length >= this.config.rateLimitPerMinute) {
            return false;
        }

        timestamps.push(now);
        this.rateLimitStore.set(userId, timestamps);

        return true;
    }

    private trackUser(message: DiscordMessage): void {
        const existing = this.users.get(message.userId);

        this.users.set(message.userId, {
            id: message.userId,
            username: message.username,
            messageCount: (existing?.messageCount ?? 0) + 1,
            lastMessage: message.timestamp,
            conversationId: existing?.conversationId,
        });
    }

    /**
     * Get user info
     */
    getUser(userId: string): DiscordUser | undefined {
        return this.users.get(userId);
    }

    /**
     * Set conversation ID for a user
     */
    setUserConversation(userId: string, conversationId: string): void {
        const user = this.users.get(userId);
        if (user) {
            user.conversationId = conversationId;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // API Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private async callApi(
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        endpoint: string,
        body?: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const url = `${this.API_BASE}${endpoint}`;

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bot ${this.config.botToken}`,
                    'Content-Type': 'application/json',
                },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (response.status === 204) {
                return { success: true };
            }

            return await response.json() as Record<string, unknown>;
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Network error',
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

let discordInstance: DiscordAdapter | null = null;

export function getDiscordAdapter(): DiscordAdapter | null {
    return discordInstance;
}

export function createDiscordAdapter(config: DiscordConfig): DiscordAdapter {
    if (discordInstance) {
        discordInstance.stop();
    }
    discordInstance = new DiscordAdapter(config);
    return discordInstance;
}

export function resetDiscordAdapter(): void {
    if (discordInstance) {
        discordInstance.stop();
        discordInstance = null;
    }
}
