/**
 * JARVIS Adapters Exports
 * 
 * Messaging platform adapters for multi-channel JARVIS access.
 */

export {
    TelegramAdapter,
    getTelegramAdapter,
    createTelegramAdapter,
    resetTelegramAdapter,
    type TelegramConfig,
    type TelegramMessage,
    type TelegramUser,
    type TelegramMessageHandler,
    type TelegramCommandHandler,
} from './TelegramAdapter.js';

export {
    WhatsAppAdapter,
    getWhatsAppAdapter,
    createWhatsAppAdapter,
    resetWhatsAppAdapter,
    type WhatsAppConfig,
    type WhatsAppMessage,
    type WhatsAppContact,
    type WhatsAppMessageHandler,
} from './WhatsAppAdapter.js';

export {
    DiscordAdapter,
    getDiscordAdapter,
    createDiscordAdapter,
    resetDiscordAdapter,
    type DiscordConfig,
    type DiscordMessage,
    type DiscordUser,
    type DiscordEmbed,
    type DiscordInteraction,
    type DiscordMessageHandler,
    type DiscordCommandHandler,
} from './DiscordAdapter.js';
