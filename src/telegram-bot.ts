/**
 * JARVIS Telegram Bot Entry Point (AGI Feature 2.5)
 * 
 * Connects the TelegramAdapter to a SkillAwareAgent,
 * enabling mobile access to JARVIS via Telegram.
 * 
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxx npx ts-node src/telegram-bot.ts
 *   Or: npm run telegram
 * 
 * Features:
 * - Message handling → agent.execute() → relay response
 * - Voice message transcription + response
 * - /start /help /status /reset commands
 * - Rate limiting per user
 */

import { TelegramAdapter, type TelegramConfig } from './adapters/TelegramAdapter.js';
import { createMainAgent } from './agent/index.js';
import { initializeMemory } from './memory/index.js';
import { initializeSkills } from './skills/index.js';
import { logger } from './utils/logger.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
const ALLOWED_USERS = process.env['TELEGRAM_ALLOWED_USERS']
    ?.split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id)) ?? [];

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set in environment.');
    console.error('   Get a token from @BotFather on Telegram.');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
    console.log('🤖 Starting JARVIS Telegram Bot...\n');

    // 1. Initialize memory
    console.log('📚 Initializing memory...');
    const memoryManager = await initializeMemory();
    const memoryContext = await memoryManager.getMemoryContext();

    // 2. Initialize skills
    console.log('🛠️  Initializing skills...');
    initializeSkills({
        enableFilesystem: true,
        enableTerminal: true,
        enableWeb: true,
        enableBrowser: false,
        enableGitHub: false,
        enableDatabase: false,
    });

    // 3. Create agent
    console.log('🧠 Creating agent...');
    const agent = createMainAgent({ memory: memoryContext });
    await agent.initialize();

    // 4. Create Telegram adapter
    const config: TelegramConfig = {
        botToken: BOT_TOKEN!,
        allowedUsers: ALLOWED_USERS.length > 0 ? ALLOWED_USERS : undefined,
        pollingInterval: 1000,
        rateLimitPerMinute: 30,
    };

    const telegram = new TelegramAdapter(config);

    // 5. Wire message handler → agent execution
    telegram.on('message', async (msg) => {
        if (!msg.text) return;

        logger.info('[TELEGRAM] Received message', {
            userId: msg.userId,
            username: msg.username,
            text: msg.text.slice(0, 50),
        });

        try {
            const result = await agent.execute(msg.text);

            // Send response back via Telegram
            telegram.emit('reply', {
                chatId: msg.chatId,
                text: result.finalContent,
                replyToMessageId: msg.messageId,
            });
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error('[TELEGRAM] Agent execution failed', { error: errorMsg });

            telegram.emit('reply', {
                chatId: msg.chatId,
                text: `⚠️ Something went wrong: ${errorMsg}`,
                replyToMessageId: msg.messageId,
            });
        }
    });

    // 6. Start polling
    try {
        await telegram.start();
        console.log('✅ JARVIS Telegram Bot is running!');
        console.log(`   Allowed users: ${ALLOWED_USERS.length > 0 ? ALLOWED_USERS.join(', ') : 'ALL (set TELEGRAM_ALLOWED_USERS to restrict)'}\n`);
    } catch (err) {
        console.error('❌ Failed to start Telegram bot:', err);
        process.exit(1);
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down Telegram bot...');
        telegram.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        telegram.stop();
        process.exit(0);
    });
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
