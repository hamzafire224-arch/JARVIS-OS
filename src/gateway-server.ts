/**
 * JARVIS Gateway Server Entry Point
 *
 * Standalone server for deploying the WebSocket gateway to Render or similar.
 * Starts the Gateway HTTP + WebSocket server and registers all JARVIS handlers.
 *
 * Usage: node dist/gateway-server.js
 */

import { Gateway } from './gateway/Gateway.js';
import { registerJarvisHandlers } from './gateway/JarvisHandlers.js';
import { logger } from './utils/logger.js';

const port = parseInt(process.env['PORT'] ?? '3001', 10);
const host = process.env['HOST'] ?? '0.0.0.0';
const authToken = process.env['GATEWAY_AUTH_TOKEN'] ?? '';

async function main() {
    logger.info('Starting JARVIS Gateway Server...', { port, host });

    const gateway = new Gateway({
        port,
        host,
        authToken: authToken || undefined,
    });

    // Register all JARVIS handlers (chat, tools, heartbeat, etc.)
    registerJarvisHandlers(gateway);

    // Start the server
    await gateway.start();

    logger.info(`🚀 JARVIS Gateway is live on ${host}:${port}`);

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        await gateway.stop();
        process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    logger.error('Gateway failed to start:', { error: String(err) });
    process.exit(1);
});
