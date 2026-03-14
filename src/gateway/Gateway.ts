/**
 * JARVIS Gateway - WebSocket Server
 * 
 * The control plane for external clients to interact with JARVIS.
 * Features:
 * - WebSocket connections for real-time communication
 * - JSON-RPC 2.0 style message protocol
 * - Session management
 * - Streaming responses
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { createServer, type Server as HttpServer, type IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import type { Message, StreamChunk, AgentResponse } from '../agent/types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Gateway Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface GatewayConfig {
    port: number;
    host?: string;
    path?: string;
    maxConnections?: number;
    heartbeatInterval?: number;
    authToken?: string;
}

export interface GatewaySession {
    id: string;
    ws: WebSocket;
    userId?: string;
    authenticated: boolean;
    connectedAt: Date;
    lastActivity: Date;
    metadata: Record<string, unknown>;
}

export interface GatewayMessage {
    jsonrpc: '2.0';
    id?: string | number;
    method?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}

export type MessageHandler = (
    session: GatewaySession,
    params: Record<string, unknown>
) => Promise<unknown>;

// Error codes following JSON-RPC 2.0
export const ErrorCodes = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
    AUTH_REQUIRED: -32000,
    AUTH_FAILED: -32001,
    RATE_LIMITED: -32002,
    SESSION_EXPIRED: -32003,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Gateway Server
// ═══════════════════════════════════════════════════════════════════════════════

export class Gateway extends EventEmitter {
    private httpServer: HttpServer;
    private wss: WebSocketServer;
    private sessions: Map<string, GatewaySession> = new Map();
    private handlers: Map<string, MessageHandler> = new Map();
    private config: Required<GatewayConfig>;
    private heartbeatTimer?: NodeJS.Timeout;

    constructor(config: GatewayConfig) {
        super();

        this.config = {
            port: config.port,
            host: config.host ?? '0.0.0.0',
            path: config.path ?? '/ws',
            maxConnections: config.maxConnections ?? 100,
            heartbeatInterval: config.heartbeatInterval ?? 30000,
            authToken: config.authToken ?? '',
        };

        // Create HTTP server
        this.httpServer = createServer((req, res) => {
            // Health check endpoint
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'ok',
                    connections: this.sessions.size,
                    uptime: process.uptime(),
                }));
                return;
            }

            res.writeHead(404);
            res.end();
        });

        // Create WebSocket server
        this.wss = new WebSocketServer({
            server: this.httpServer,
            path: this.config.path,
            maxPayload: 10 * 1024 * 1024, // 10MB max payload
        });

        this.setupWebSocket();
        this.registerDefaultHandlers();

        logger.agent('Gateway created', { path: this.config.path });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Server Lifecycle
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Start the gateway server
     */
    async start(): Promise<void> {
        return new Promise((resolve) => {
            this.httpServer.listen(this.config.port, this.config.host, () => {
                logger.agent('Gateway started', {
                    port: this.config.port,
                    host: this.config.host,
                    path: this.config.path,
                });

                // Start heartbeat
                this.startHeartbeat();

                this.emit('started');
                resolve();
            });
        });
    }

    /**
     * Stop the gateway server
     */
    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Stop heartbeat
            if (this.heartbeatTimer) {
                clearInterval(this.heartbeatTimer);
            }

            // Close all connections
            for (const session of this.sessions.values()) {
                session.ws.close(1001, 'Server shutting down');
            }
            this.sessions.clear();

            // Close servers
            this.wss.close((err) => {
                if (err) {
                    logger.error('Error closing WebSocket server', { error: err.message });
                }

                this.httpServer.close((httpErr) => {
                    if (httpErr) {
                        logger.error('Error closing HTTP server', { error: httpErr.message });
                        reject(httpErr);
                        return;
                    }

                    logger.agent('Gateway stopped');
                    this.emit('stopped');
                    resolve();
                });
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // WebSocket Handling
    // ─────────────────────────────────────────────────────────────────────────────

    private setupWebSocket(): void {
        this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
            // Check max connections
            if (this.sessions.size >= this.config.maxConnections) {
                ws.close(1013, 'Max connections reached');
                return;
            }

            // Create session
            const sessionId = randomUUID();
            const session: GatewaySession = {
                id: sessionId,
                ws,
                authenticated: !this.config.authToken, // Auto-auth if no token required
                connectedAt: new Date(),
                lastActivity: new Date(),
                metadata: {
                    ip: req.socket.remoteAddress,
                    userAgent: req.headers['user-agent'],
                },
            };

            this.sessions.set(sessionId, session);

            logger.agent('Client connected', {
                sessionId,
                ip: session.metadata['ip'],
            });

            // Send welcome message
            this.sendMessage(session, {
                jsonrpc: '2.0',
                method: 'connected',
                params: {
                    sessionId,
                    authenticated: session.authenticated,
                    serverTime: new Date().toISOString(),
                },
            });

            // Handle messages
            ws.on('message', (data: RawData) => {
                this.handleMessage(session, data);
            });

            // Handle close
            ws.on('close', (code, reason) => {
                this.sessions.delete(sessionId);
                logger.agent('Client disconnected', {
                    sessionId,
                    code,
                    reason: reason.toString(),
                });
                this.emit('disconnected', session);
            });

            // Handle errors
            ws.on('error', (error) => {
                logger.error('WebSocket error', {
                    sessionId,
                    error: error.message,
                });
            });

            this.emit('connected', session);
        });
    }

    private async handleMessage(session: GatewaySession, data: RawData): Promise<void> {
        session.lastActivity = new Date();

        let message: GatewayMessage;

        // Parse message
        try {
            message = JSON.parse(data.toString()) as GatewayMessage;
        } catch {
            this.sendError(session, undefined, ErrorCodes.PARSE_ERROR, 'Invalid JSON');
            return;
        }

        // Validate JSON-RPC
        if (message.jsonrpc !== '2.0' || !message.method) {
            this.sendError(session, message.id, ErrorCodes.INVALID_REQUEST, 'Invalid request');
            return;
        }

        // Check authentication for non-auth methods
        if (!session.authenticated && message.method !== 'authenticate') {
            this.sendError(session, message.id, ErrorCodes.AUTH_REQUIRED, 'Authentication required');
            return;
        }

        // Find handler
        const handler = this.handlers.get(message.method);
        if (!handler) {
            this.sendError(session, message.id, ErrorCodes.METHOD_NOT_FOUND, `Method not found: ${message.method}`);
            return;
        }

        // Execute handler
        try {
            const result = await handler(session, message.params ?? {});

            // Send response if request had an ID
            if (message.id !== undefined) {
                this.sendMessage(session, {
                    jsonrpc: '2.0',
                    id: message.id,
                    result,
                });
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.sendError(session, message.id, ErrorCodes.INTERNAL_ERROR, errorMessage);
        }
    }

    private startHeartbeat(): void {
        this.heartbeatTimer = setInterval(() => {
            const now = Date.now();

            for (const [sessionId, session] of this.sessions) {
                // Check for dead connections
                const lastActivity = session.lastActivity.getTime();
                if (now - lastActivity > this.config.heartbeatInterval * 3) {
                    logger.agent('Session timed out', { sessionId });
                    session.ws.terminate();
                    this.sessions.delete(sessionId);
                    continue;
                }

                // Send ping
                if (session.ws.readyState === WebSocket.OPEN) {
                    session.ws.ping();
                }
            }
        }, this.config.heartbeatInterval);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Message Sending
    // ─────────────────────────────────────────────────────────────────────────────

    private sendMessage(session: GatewaySession, message: GatewayMessage): void {
        if (session.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        try {
            session.ws.send(JSON.stringify(message));
        } catch (error) {
            logger.error('Failed to send message', {
                sessionId: session.id,
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }

    private sendError(
        session: GatewaySession,
        id: string | number | undefined,
        code: number,
        message: string,
        data?: unknown
    ): void {
        this.sendMessage(session, {
            jsonrpc: '2.0',
            id,
            error: { code, message, data },
        });
    }

    /**
     * Broadcast a message to all authenticated sessions
     */
    broadcast(method: string, params: Record<string, unknown>): void {
        const message: GatewayMessage = {
            jsonrpc: '2.0',
            method,
            params,
        };

        for (const session of this.sessions.values()) {
            if (session.authenticated) {
                this.sendMessage(session, message);
            }
        }
    }

    /**
     * Send a streaming chunk to a session
     */
    sendStreamChunk(sessionId: string, chunk: StreamChunk): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        this.sendMessage(session, {
            jsonrpc: '2.0',
            method: 'stream',
            params: chunk as unknown as Record<string, unknown>,
        });
    }

    /**
     * Get a session by ID
     */
    getSession(sessionId: string): GatewaySession | undefined {
        return this.sessions.get(sessionId);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Handler Registration
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Register a message handler
     */
    registerHandler(method: string, handler: MessageHandler): void {
        this.handlers.set(method, handler);
    }

    private registerDefaultHandlers(): void {
        // Authentication handler
        this.registerHandler('authenticate', async (session, params) => {
            const token = params['token'] as string;

            if (!this.config.authToken || token === this.config.authToken) {
                session.authenticated = true;
                session.userId = params['userId'] as string | undefined;

                logger.agent('Session authenticated', {
                    sessionId: session.id,
                    userId: session.userId,
                });

                return { success: true };
            }

            throw new Error('Invalid token');
        });

        // Ping handler
        this.registerHandler('ping', async () => {
            return { pong: true, timestamp: Date.now() };
        });

        // Get session info
        this.registerHandler('getSession', async (session) => {
            return {
                id: session.id,
                userId: session.userId,
                connectedAt: session.connectedAt.toISOString(),
                authenticated: session.authenticated,
            };
        });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Stats
    // ─────────────────────────────────────────────────────────────────────────────

    getStats(): {
        connections: number;
        authenticated: number;
        uptime: number;
    } {
        let authenticated = 0;
        for (const session of this.sessions.values()) {
            if (session.authenticated) authenticated++;
        }

        return {
            connections: this.sessions.size,
            authenticated,
            uptime: process.uptime(),
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════════════════════════

export function createGateway(config: GatewayConfig): Gateway {
    return new Gateway(config);
}
