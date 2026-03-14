/**
 * JARVIS Telegram Bot Adapter
 * 
 * Enables 24/7 mobile access to JARVIS via Telegram.
 * Features:
 * - Message handling with conversation context
 * - Voice message support (transcription)
 * - Photo/document handling
 * - Inline keyboards for quick actions
 * - Command system (/start, /reset, /help, /status)
 * - Rate limiting and user authorization
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { getConfig } from '../config/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface TelegramConfig {
    /** Bot token from @BotFather */
    botToken: string;
    /** Allowed user IDs (empty = allow all) */
    allowedUsers?: number[];
    /** Webhook URL (if using webhooks instead of polling) */
    webhookUrl?: string;
    /** Polling interval in ms (if using polling) */
    pollingInterval?: number;
    /** Rate limit: max messages per minute per user */
    rateLimitPerMinute?: number;
}

export interface TelegramMessage {
    messageId: number;
    chatId: number;
    userId: number;
    username?: string;
    firstName?: string;
    text?: string;
    isCommand: boolean;
    command?: string;
    commandArgs?: string;
    hasPhoto: boolean;
    hasDocument: boolean;
    hasVoice: boolean;
    replyToMessageId?: number;
    timestamp: Date;
}

export interface TelegramUser {
    id: number;
    username?: string;
    firstName: string;
    lastName?: string;
    authorized: boolean;
    messageCount: number;
    lastMessage: Date;
    conversationId?: string;
}

export type TelegramMessageHandler = (message: TelegramMessage) => Promise<string | void>;
export type TelegramCommandHandler = (message: TelegramMessage, args: string) => Promise<string | void>;

// ═══════════════════════════════════════════════════════════════════════════════
// Telegram Bot Adapter
// ═══════════════════════════════════════════════════════════════════════════════

export class TelegramAdapter extends EventEmitter {
    private config: Required<Omit<TelegramConfig, 'webhookUrl'>> & { webhookUrl?: string };
    private isRunning: boolean = false;
    private pollingTimer?: NodeJS.Timeout;
    private lastUpdateId: number = 0;
    private users: Map<number, TelegramUser> = new Map();
    private messageHandlers: TelegramMessageHandler[] = [];
    private commandHandlers: Map<string, TelegramCommandHandler> = new Map();
    private rateLimitStore: Map<number, number[]> = new Map(); // userId -> timestamps

    constructor(config: TelegramConfig) {
        super();

        this.config = {
            botToken: config.botToken,
            allowedUsers: config.allowedUsers ?? [],
            webhookUrl: config.webhookUrl,
            pollingInterval: config.pollingInterval ?? 1000,
            rateLimitPerMinute: config.rateLimitPerMinute ?? 30,
        };

        // Register default commands
        this.registerDefaultCommands();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the Telegram bot
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Telegram adapter already running');
            return;
        }

        // Verify bot token
        const me = await this.callApi('getMe');
        if (!me.ok) {
            throw new Error(`Invalid bot token: ${me.description}`);
        }

        logger.gateway('Telegram bot connected', {
            username: me.result.username,
            botId: me.result.id,
        });

        this.isRunning = true;

        if (this.config.webhookUrl) {
            // Set up webhook
            await this.setupWebhook();
        } else {
            // Start polling
            this.startPolling();
        }

        this.emit('started', me.result);
    }

    /**
     * Stop the Telegram bot
     */
    async stop(): Promise<void> {
        if (!this.isRunning) return;

        this.isRunning = false;

        if (this.pollingTimer) {
            clearTimeout(this.pollingTimer);
            this.pollingTimer = undefined;
        }

        if (this.config.webhookUrl) {
            await this.callApi('deleteWebhook');
        }

        logger.gateway('Telegram adapter stopped');
        this.emit('stopped');
    }

    /**
     * Check if bot is running
     */
    isActive(): boolean {
        return this.isRunning;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Handler Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a message handler
     */
    onMessage(handler: TelegramMessageHandler): void {
        this.messageHandlers.push(handler);
    }

    /**
     * Register a command handler
     */
    onCommand(command: string, handler: TelegramCommandHandler): void {
        this.commandHandlers.set(command.toLowerCase(), handler);
    }

    /**
     * Clear all handlers
     */
    clearHandlers(): void {
        this.messageHandlers = [];
        this.commandHandlers.clear();
        this.registerDefaultCommands();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Messaging
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Send a text message
     */
    async sendMessage(
        chatId: number,
        text: string,
        options: {
            parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
            replyToMessageId?: number;
            disableNotification?: boolean;
        } = {}
    ): Promise<boolean> {
        // Split long messages (Telegram limit is 4096 chars)
        const chunks = this.splitMessage(text, 4000);

        for (const chunk of chunks) {
            const result = await this.callApi('sendMessage', {
                chat_id: chatId,
                text: chunk,
                parse_mode: options.parseMode,
                reply_to_message_id: options.replyToMessageId,
                disable_notification: options.disableNotification,
            });

            if (!result.ok) {
                logger.error('Failed to send Telegram message', {
                    chatId,
                    error: result.description,
                });
                return false;
            }
        }

        return true;
    }

    /**
     * Send a typing indicator
     */
    async sendTyping(chatId: number): Promise<void> {
        await this.callApi('sendChatAction', {
            chat_id: chatId,
            action: 'typing',
        });
    }

    /**
     * Send a message with inline keyboard
     */
    async sendWithKeyboard(
        chatId: number,
        text: string,
        keyboard: { text: string; callbackData: string }[][]
    ): Promise<boolean> {
        const result = await this.callApi('sendMessage', {
            chat_id: chatId,
            text,
            reply_markup: {
                inline_keyboard: keyboard.map(row =>
                    row.map(btn => ({
                        text: btn.text,
                        callback_data: btn.callbackData,
                    }))
                ),
            },
        });

        return result.ok;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Polling
    // ─────────────────────────────────────────────────────────────────────────────

    private startPolling(): void {
        logger.gateway('Starting Telegram polling', {
            interval: this.config.pollingInterval,
        });

        const poll = async () => {
            if (!this.isRunning) return;

            try {
                const updates = await this.callApi('getUpdates', {
                    offset: this.lastUpdateId + 1,
                    timeout: 30,
                    allowed_updates: ['message', 'callback_query'],
                });

                if (updates.ok && updates.result.length > 0) {
                    for (const update of updates.result) {
                        this.lastUpdateId = update.update_id;
                        await this.handleUpdate(update);
                    }
                }
            } catch (error) {
                logger.error('Telegram polling error', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }

            // Schedule next poll
            this.pollingTimer = setTimeout(poll, this.config.pollingInterval);
        };

        poll();
    }

    private async setupWebhook(): Promise<void> {
        const result = await this.callApi('setWebhook', {
            url: this.config.webhookUrl,
            allowed_updates: ['message', 'callback_query'],
        });

        if (!result.ok) {
            throw new Error(`Failed to set webhook: ${result.description}`);
        }

        logger.gateway('Telegram webhook configured', {
            url: this.config.webhookUrl,
        });
    }

    /**
     * Handle incoming webhook update (call this from your HTTP handler)
     */
    async handleWebhookUpdate(update: unknown): Promise<void> {
        await this.handleUpdate(update as Record<string, unknown>);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Update Handling
    // ─────────────────────────────────────────────────────────────────────────────

    private async handleUpdate(update: Record<string, unknown>): Promise<void> {
        if (update.message) {
            await this.handleMessage(update.message as Record<string, unknown>);
        } else if (update.callback_query) {
            await this.handleCallbackQuery(update.callback_query as Record<string, unknown>);
        }
    }

    private async handleMessage(rawMessage: Record<string, unknown>): Promise<void> {
        const chat = rawMessage.chat as Record<string, unknown>;
        const from = rawMessage.from as Record<string, unknown>;

        const message: TelegramMessage = {
            messageId: rawMessage.message_id as number,
            chatId: chat.id as number,
            userId: from.id as number,
            username: from.username as string | undefined,
            firstName: from.first_name as string | undefined,
            text: rawMessage.text as string | undefined,
            isCommand: false,
            hasPhoto: !!rawMessage.photo,
            hasDocument: !!rawMessage.document,
            hasVoice: !!rawMessage.voice,
            replyToMessageId: (rawMessage.reply_to_message as Record<string, unknown>)?.message_id as number | undefined,
            timestamp: new Date((rawMessage.date as number) * 1000),
        };

        // Parse command
        if (message.text?.startsWith('/')) {
            message.isCommand = true;
            const parts = message.text.slice(1).split(' ');
            message.command = parts[0]?.split('@')[0]?.toLowerCase();
            message.commandArgs = parts.slice(1).join(' ');
        }

        // Authorization check
        if (!this.isAuthorized(message.userId)) {
            logger.warn('Unauthorized Telegram user', {
                userId: message.userId,
                username: message.username,
            });
            await this.sendMessage(
                message.chatId,
                '⛔ You are not authorized to use this bot.'
            );
            return;
        }

        // Rate limiting
        if (!this.checkRateLimit(message.userId)) {
            await this.sendMessage(
                message.chatId,
                '⏳ You are sending messages too quickly. Please wait a moment.'
            );
            return;
        }

        // Track user
        this.trackUser(message);

        // Emit event
        this.emit('message', message);

        // Handle command
        if (message.isCommand && message.command) {
            const handler = this.commandHandlers.get(message.command);
            if (handler) {
                try {
                    const response = await handler(message, message.commandArgs ?? '');
                    if (response) {
                        await this.sendMessage(message.chatId, response);
                    }
                } catch (error) {
                    logger.error('Telegram command handler error', {
                        command: message.command,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    await this.sendMessage(message.chatId, '❌ An error occurred processing your command.');
                }
                return;
            }
        }

        // Handle regular message
        if (message.text && !message.isCommand) {
            // Show typing indicator
            await this.sendTyping(message.chatId);

            for (const handler of this.messageHandlers) {
                try {
                    const response = await handler(message);
                    if (response) {
                        await this.sendMessage(message.chatId, response);
                        break; // First handler that responds wins
                    }
                } catch (error) {
                    logger.error('Telegram message handler error', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    await this.sendMessage(message.chatId, '❌ An error occurred processing your message.');
                }
            }
        }
    }

    private async handleCallbackQuery(query: Record<string, unknown>): Promise<void> {
        const callbackId = query.id as string;
        const data = query.data as string;
        const from = query.from as Record<string, unknown>;
        const message = query.message as Record<string, unknown>;

        // Acknowledge the callback
        await this.callApi('answerCallbackQuery', {
            callback_query_id: callbackId,
        });

        this.emit('callback', {
            callbackId,
            data,
            userId: from.id as number,
            chatId: (message.chat as Record<string, unknown>).id as number,
            messageId: message.message_id as number,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Authorization & Rate Limiting
    // ─────────────────────────────────────────────────────────────────────────────

    private isAuthorized(userId: number): boolean {
        // If no allowlist, allow everyone
        if (this.config.allowedUsers.length === 0) {
            return true;
        }
        return this.config.allowedUsers.includes(userId);
    }

    private checkRateLimit(userId: number): boolean {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Get user's message timestamps
        let timestamps = this.rateLimitStore.get(userId) ?? [];

        // Filter to last minute
        timestamps = timestamps.filter(t => t > oneMinuteAgo);

        // Check limit
        if (timestamps.length >= this.config.rateLimitPerMinute) {
            return false;
        }

        // Add current timestamp
        timestamps.push(now);
        this.rateLimitStore.set(userId, timestamps);

        return true;
    }

    private trackUser(message: TelegramMessage): void {
        const existing = this.users.get(message.userId);

        this.users.set(message.userId, {
            id: message.userId,
            username: message.username,
            firstName: message.firstName ?? 'Unknown',
            authorized: true,
            messageCount: (existing?.messageCount ?? 0) + 1,
            lastMessage: message.timestamp,
            conversationId: existing?.conversationId,
        });
    }

    /**
     * Get user info
     */
    getUser(userId: number): TelegramUser | undefined {
        return this.users.get(userId);
    }

    /**
     * Set conversation ID for a user (for context tracking)
     */
    setUserConversation(userId: number, conversationId: string): void {
        const user = this.users.get(userId);
        if (user) {
            user.conversationId = conversationId;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Default Commands
    // ─────────────────────────────────────────────────────────────────────────────

    private registerDefaultCommands(): void {
        this.onCommand('start', async (message) => {
            return `👋 Hello${message.firstName ? ` ${message.firstName}` : ''}!

I'm JARVIS, your personal AI assistant. I'm here to help you 24/7.

**Available Commands:**
/help - Show this help message
/status - Check my status
/reset - Clear conversation history
/memory [query] - Search my memory

Just send me any message and I'll do my best to help you!`;
        });

        this.onCommand('help', async () => {
            return `**JARVIS Commands**

/start - Get started
/help - Show this help
/status - Check bot status
/reset - Clear conversation
/memory [query] - Search memories

**Tips:**
• Send any text to chat with me
• I remember our conversation context
• Use /reset to start fresh`;
        });

        this.onCommand('status', async (message) => {
            const user = this.users.get(message.userId);
            return `**JARVIS Status**

🟢 Online and ready
📊 Messages from you: ${user?.messageCount ?? 0}
⏰ Server time: ${new Date().toISOString()}`;
        });

        this.onCommand('reset', async (message) => {
            const user = this.users.get(message.userId);
            if (user) {
                user.conversationId = undefined;
            }
            this.emit('reset', message.userId);
            return '🔄 Conversation cleared. Let\'s start fresh!';
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // API Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    private async callApi(
        method: string,
        params?: Record<string, unknown>
    ): Promise<{ ok: boolean; result?: any; description?: string }> {
        const url = `https://api.telegram.org/bot${this.config.botToken}/${method}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: params ? JSON.stringify(params) : undefined,
            });

            return await response.json() as { ok: boolean; result?: any; description?: string };
        } catch (error) {
            return {
                ok: false,
                description: error instanceof Error ? error.message : 'Network error',
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

            // Find a good breaking point
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

let telegramInstance: TelegramAdapter | null = null;

export function getTelegramAdapter(): TelegramAdapter | null {
    return telegramInstance;
}

export function createTelegramAdapter(config: TelegramConfig): TelegramAdapter {
    if (telegramInstance) {
        telegramInstance.stop();
    }
    telegramInstance = new TelegramAdapter(config);
    return telegramInstance;
}

export function resetTelegramAdapter(): void {
    if (telegramInstance) {
        telegramInstance.stop();
        telegramInstance = null;
    }
}
