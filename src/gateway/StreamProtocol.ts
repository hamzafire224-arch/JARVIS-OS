/**
 * JARVIS Stream Protocol
 * 
 * Structured event types for the real-time streaming pipeline.
 * Clients receive granular visibility into agent operations:
 * - Agent thinking/reasoning
 * - Tool execution (start + result)
 * - Autonomous progress tracking
 * - Error events
 * 
 * Tier 2 AGI Upgrade: Professional UX that builds user trust.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════════════════════════════════════════

export type StreamEventType =
    | 'thinking'       // Agent reasoning/planning
    | 'text'           // Final response text (token-by-token)
    | 'tool_start'     // Tool execution begins
    | 'tool_result'    // Tool execution completes
    | 'progress'       // Autonomous execution progress (ReasoningEngine)
    | 'agent_switch'   // Multi-agent: switched to different agent
    | 'error'          // Error event
    | 'status'         // Status update (e.g., "searching...", "writing file...")
    | 'complete';      // Response complete

export interface StreamEvent {
    /** Event type identifier */
    type: StreamEventType;

    /** ISO timestamp */
    timestamp: string;

    /** Event payload (varies by type) */
    data: StreamEventData;

    /** Optional sequence number for ordering */
    seq?: number;

    /** Session/conversation context */
    sessionId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Data Shapes
// ═══════════════════════════════════════════════════════════════════════════════

export type StreamEventData =
    | ThinkingEvent
    | TextEvent
    | ToolStartEvent
    | ToolResultEvent
    | ProgressEvent
    | AgentSwitchEvent
    | ErrorEvent
    | StatusEvent
    | CompleteEvent;

export interface ThinkingEvent {
    type: 'thinking';
    content: string;          // Agent's reasoning text
    phase?: 'planning' | 'analyzing' | 'deciding';
}

export interface TextEvent {
    type: 'text';
    content: string;          // Token or chunk of response text
    isComplete?: boolean;     // True if this is the final text chunk
}

export interface ToolStartEvent {
    type: 'tool_start';
    toolName: string;         // Name of the tool being invoked
    toolArgs: Record<string, unknown>;  // Arguments passed
    description?: string;     // Human-readable description of what's happening
}

export interface ToolResultEvent {
    type: 'tool_result';
    toolName: string;
    success: boolean;
    result?: unknown;         // Tool execution result (may be truncated for large outputs)
    durationMs: number;       // How long the tool took
    error?: string;           // Error message if failed
}

export interface ProgressEvent {
    type: 'progress';
    phase: 'plan_start' | 'plan_complete' | 'node_start' | 'node_complete' | 'replan' | 'complete';
    current?: number;         // Current step number
    total?: number;           // Total steps
    description: string;      // What's happening
    success?: boolean;        // For completion events
}

export interface AgentSwitchEvent {
    type: 'agent_switch';
    fromAgent: string;
    toAgent: string;
    reason: string;           // Why the switch happened
}

export interface ErrorEvent {
    type: 'error';
    code: string;             // Error code
    message: string;          // Human-readable error
    recoverable: boolean;     // Can the system continue?
}

export interface StatusEvent {
    type: 'status';
    message: string;          // "Searching the web...", "Writing file..."
    icon?: string;            // Emoji for UI display
}

export interface CompleteEvent {
    type: 'complete';
    totalDurationMs: number;
    toolsUsed: number;
    tokensUsed?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stream Event Builder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builder class for creating structured stream events.
 * Used by Gateway and Agent to emit events to connected clients.
 */
export class StreamEventBuilder {
    private seq = 0;
    private sessionId?: string;

    constructor(sessionId?: string) {
        this.sessionId = sessionId;
    }

    private build(data: StreamEventData): StreamEvent {
        return {
            type: data.type,
            timestamp: new Date().toISOString(),
            data,
            seq: this.seq++,
            sessionId: this.sessionId,
        };
    }

    thinking(content: string, phase?: ThinkingEvent['phase']): StreamEvent {
        return this.build({ type: 'thinking', content, phase });
    }

    text(content: string, isComplete = false): StreamEvent {
        return this.build({ type: 'text', content, isComplete });
    }

    toolStart(toolName: string, toolArgs: Record<string, unknown>, description?: string): StreamEvent {
        return this.build({ type: 'tool_start', toolName, toolArgs, description });
    }

    toolResult(toolName: string, success: boolean, durationMs: number, result?: unknown, error?: string): StreamEvent {
        // Truncate large results for streaming
        let truncatedResult = result;
        if (typeof result === 'string' && result.length > 500) {
            truncatedResult = result.slice(0, 500) + '... (truncated)';
        }
        return this.build({ type: 'tool_result', toolName, success, durationMs, result: truncatedResult, error });
    }

    progress(phase: ProgressEvent['phase'], description: string, current?: number, total?: number, success?: boolean): StreamEvent {
        return this.build({ type: 'progress', phase, description, current, total, success });
    }

    agentSwitch(fromAgent: string, toAgent: string, reason: string): StreamEvent {
        return this.build({ type: 'agent_switch', fromAgent, toAgent, reason });
    }

    error(code: string, message: string, recoverable = true): StreamEvent {
        return this.build({ type: 'error', code, message, recoverable });
    }

    status(message: string, icon?: string): StreamEvent {
        return this.build({ type: 'status', message, icon });
    }

    complete(totalDurationMs: number, toolsUsed: number, tokensUsed?: number): StreamEvent {
        return this.build({ type: 'complete', totalDurationMs, toolsUsed, tokensUsed });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Stream Event Subscriber
// ═══════════════════════════════════════════════════════════════════════════════

export type StreamEventCallback = (event: StreamEvent) => void;

/**
 * Manages subscriptions for structured stream events.
 * Clients can subscribe to specific event types or all events.
 */
export class StreamEventBus {
    private subscribers: Map<string, Set<StreamEventCallback>> = new Map();
    private globalSubscribers: Set<StreamEventCallback> = new Set();

    /**
     * Subscribe to specific event type(s)
     */
    on(eventType: StreamEventType | StreamEventType[], callback: StreamEventCallback): () => void {
        const types = Array.isArray(eventType) ? eventType : [eventType];

        for (const type of types) {
            if (!this.subscribers.has(type)) {
                this.subscribers.set(type, new Set());
            }
            this.subscribers.get(type)!.add(callback);
        }

        // Return unsubscribe function
        return () => {
            for (const type of types) {
                this.subscribers.get(type)?.delete(callback);
            }
        };
    }

    /**
     * Subscribe to all events
     */
    onAll(callback: StreamEventCallback): () => void {
        this.globalSubscribers.add(callback);
        return () => this.globalSubscribers.delete(callback);
    }

    /**
     * Emit an event to all relevant subscribers
     */
    emit(event: StreamEvent): void {
        // Type-specific subscribers
        const typeSubscribers = this.subscribers.get(event.type);
        if (typeSubscribers) {
            for (const cb of typeSubscribers) {
                try { cb(event); } catch { /* subscriber errors don't propagate */ }
            }
        }

        // Global subscribers
        for (const cb of this.globalSubscribers) {
            try { cb(event); } catch { /* subscriber errors don't propagate */ }
        }
    }

    /**
     * Remove all subscribers
     */
    clear(): void {
        this.subscribers.clear();
        this.globalSubscribers.clear();
    }
}
