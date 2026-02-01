/**
 * JARVIS Logging Utility
 * 
 * Structured logging with Winston for comprehensive agent activity tracking.
 * Supports console, file, and combined output with configurable log levels.
 */

import winston from 'winston';
import { getConfig, resolveLogPath } from '../config/index.js';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// ═══════════════════════════════════════════════════════════════════════════════
// Custom Log Format
// ═══════════════════════════════════════════════════════════════════════════════

const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}`;
    })
);

const coloredFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    customFormat
);

// ═══════════════════════════════════════════════════════════════════════════════
// Logger Factory
// ═══════════════════════════════════════════════════════════════════════════════

let _logger: winston.Logger | null = null;

function createLogger(): winston.Logger {
    const config = getConfig();
    const logPath = resolveLogPath();
    const transports: winston.transport[] = [];

    // Ensure log directory exists
    const logDir = dirname(logPath);
    if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
    }

    // Console transport
    if (config.logging.output === 'console' || config.logging.output === 'both') {
        transports.push(
            new winston.transports.Console({
                format: coloredFormat,
            })
        );
    }

    // File transport
    if (config.logging.output === 'file' || config.logging.output === 'both') {
        transports.push(
            new winston.transports.File({
                filename: logPath,
                format: customFormat,
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                tailable: true,
            })
        );
    }

    return winston.createLogger({
        level: config.logging.level,
        transports,
        exitOnError: false,
    });
}

export function getLogger(): winston.Logger {
    if (!_logger) {
        _logger = createLogger();
    }
    return _logger;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Convenience Exports
// ═══════════════════════════════════════════════════════════════════════════════

export const logger = {
    debug: (message: string, meta?: object) => getLogger().debug(message, meta),
    info: (message: string, meta?: object) => getLogger().info(message, meta),
    warn: (message: string, meta?: object) => getLogger().warn(message, meta),
    error: (message: string, meta?: object) => getLogger().error(message, meta),

    // Specialized logging for agent operations
    agent: (action: string, details?: object) => {
        getLogger().info(`[AGENT] ${action}`, details);
    },

    tool: (toolName: string, action: string, details?: object) => {
        getLogger().info(`[TOOL:${toolName}] ${action}`, details);
    },

    provider: (providerName: string, action: string, details?: object) => {
        getLogger().info(`[PROVIDER:${providerName}] ${action}`, details);
    },

    memory: (action: string, details?: object) => {
        getLogger().info(`[MEMORY] ${action}`, details);
    },

    gateway: (action: string, details?: object) => {
        getLogger().info(`[GATEWAY] ${action}`, details);
    },

    scheduler: (action: string, details?: object) => {
        getLogger().info(`[SCHEDULER] ${action}`, details);
    },
};

export default logger;

