'use client';

/**
 * JARVIS Gateway WebSocket Client (AGI Feature 2.4)
 * 
 * Connects the Dashboard to the JARVIS Gateway for real-time
 * activity streaming. Provides React hooks for consuming events.
 */

import { useEffect, useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types (mirrored from src/gateway/StreamProtocol.ts)
// ═══════════════════════════════════════════════════════════════════════════════

export type StreamEventType =
    | 'thinking' | 'text' | 'tool_start' | 'tool_result'
    | 'progress' | 'agent_switch' | 'error' | 'status' | 'complete';

export interface StreamEvent {
    type: StreamEventType;
    timestamp: string;
    data: Record<string, unknown>;
    seq?: number;
    sessionId?: string;
}

export interface GatewayConnectionState {
    connected: boolean;
    url: string;
    reconnectAttempts: number;
    lastEventAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Gateway Client Class
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 1000;

export class GatewayClient {
    private ws: WebSocket | null = null;
    private url: string;
    private reconnectAttempts = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private eventHandlers: Map<string, Set<(event: StreamEvent) => void>> = new Map();
    private allHandlers: Set<(event: StreamEvent) => void> = new Set();
    private _connected = false;

    constructor(url?: string) {
        this.url = url ?? DEFAULT_GATEWAY_URL;
    }

    connect(): void {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                this._connected = true;
                this.reconnectAttempts = 0;

                // Subscribe to activity stream
                this.ws?.send(JSON.stringify({
                    type: 'stream.subscribe',
                    payload: { events: ['*'] },
                }));

                this.emit('status', { type: 'connected' });
            };

            this.ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data) as StreamEvent;
                    this.handleEvent(parsed);
                } catch {
                    // Invalid JSON — ignore
                }
            };

            this.ws.onclose = () => {
                this._connected = false;
                this.emit('status', { type: 'disconnected' });
                this.scheduleReconnect();
            };

            this.ws.onerror = () => {
                this._connected = false;
            };
        } catch {
            this.scheduleReconnect();
        }
    }

    disconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._connected = false;
    }

    get connected(): boolean {
        return this._connected;
    }

    // ─────────────────── Event Handling ───────────────────

    on(eventType: string, handler: (event: StreamEvent) => void): () => void {
        if (eventType === '*') {
            this.allHandlers.add(handler);
            return () => this.allHandlers.delete(handler);
        }

        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)!.add(handler);
        return () => this.eventHandlers.get(eventType)?.delete(handler);
    }

    private handleEvent(event: StreamEvent): void {
        // Notify type-specific handlers
        const handlers = this.eventHandlers.get(event.type);
        if (handlers) {
            for (const handler of handlers) handler(event);
        }

        // Notify wildcard handlers
        for (const handler of this.allHandlers) handler(event);
    }

    private emit(type: StreamEventType, data: Record<string, unknown>): void {
        this.handleEvent({
            type,
            timestamp: new Date().toISOString(),
            data,
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

        this.reconnectAttempts++;
        const delay = RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts - 1);

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, Math.min(delay, 30000));
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * React hook for connecting to the Gateway and receiving events.
 * Auto-connects on mount, auto-disconnects on unmount.
 */
export function useGatewayEvents(maxEvents = 100): {
    events: StreamEvent[];
    connected: boolean;
    clear: () => void;
} {
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const clientRef = useRef<GatewayClient | null>(null);

    useEffect(() => {
        const client = new GatewayClient();
        clientRef.current = client;

        // Listen for all events
        const unsubAll = client.on('*', (event) => {
            setEvents(prev => {
                const next = [event, ...prev];
                return next.length > maxEvents ? next.slice(0, maxEvents) : next;
            });
        });

        // Connection state
        const unsubStatus = client.on('status', (event) => {
            setConnected(event.data['type'] === 'connected');
        });

        client.connect();

        return () => {
            unsubAll();
            unsubStatus();
            client.disconnect();
        };
    }, [maxEvents]);

    const clear = useCallback(() => setEvents([]), []);

    return { events, connected, clear };
}

/**
 * Singleton gateway client (for use outside React components)
 */
let singletonClient: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
    if (!singletonClient) {
        singletonClient = new GatewayClient();
    }
    return singletonClient;
}
