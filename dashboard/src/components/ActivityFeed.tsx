'use client';

/**
 * JARVIS Activity Feed Component (AGI Feature 2.4)
 * 
 * Real-time visualization of JARVIS operations:
 * - Thinking/reasoning indicators
 * - Tool execution cards with duration
 * - Progress bars for autonomous execution
 * - Agent switch markers
 * - Error events with retry hints
 */

import { useGatewayEvents, type StreamEvent } from '@/lib/gateway-client';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Event Icons & Colors
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    thinking: { icon: '🧠', color: '#a78bfa', label: 'Thinking' },
    text: { icon: '💬', color: '#60a5fa', label: 'Response' },
    tool_start: { icon: '⚡', color: '#fbbf24', label: 'Tool Start' },
    tool_result: { icon: '✅', color: '#34d399', label: 'Tool Result' },
    progress: { icon: '📊', color: '#818cf8', label: 'Progress' },
    agent_switch: { icon: '🔄', color: '#f472b6', label: 'Agent Switch' },
    error: { icon: '❌', color: '#ef4444', label: 'Error' },
    status: { icon: '📡', color: '#94a3b8', label: 'Status' },
    complete: { icon: '🎯', color: '#22d3ee', label: 'Complete' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Activity Feed Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ActivityFeed() {
    const { events, connected, clear } = useGatewayEvents(200);
    const [filter, setFilter] = useState<string>('all');

    const filteredEvents = filter === 'all'
        ? events
        : events.filter(e => e.type === filter);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            width: '100%',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: connected ? '#22c55e' : '#ef4444',
                        boxShadow: connected ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
                        animation: connected ? 'pulse 2s infinite' : 'none',
                    }} />
                    <span style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.6)',
                        fontWeight: 500,
                    }}>
                        {connected ? 'Connected to Gateway' : 'Disconnected'}
                    </span>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.4)',
                        padding: '4px 8px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                    }}>
                        {events.length} events
                    </span>
                    <button
                        onClick={clear}
                        style={{
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.5)',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                            (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                        }}
                        onMouseLeave={e => {
                            (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
            }}>
                {['all', 'thinking', 'tool_start', 'tool_result', 'progress', 'error'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: filter === type ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
                            background: filter === type ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                            color: filter === type ? '#818cf8' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontWeight: filter === type ? 600 : 400,
                        }}
                    >
                        {EVENT_CONFIG[type]?.icon ?? '📋'} {type === 'all' ? 'All' : EVENT_CONFIG[type]?.label ?? type}
                    </button>
                ))}
            </div>

            {/* Event Stream */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '600px',
                overflowY: 'auto',
                paddingRight: '4px',
            }}>
                {filteredEvents.length === 0 && (
                    <div style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: '14px',
                    }}>
                        {connected
                            ? '⏳ Waiting for JARVIS activity...'
                            : '🔌 Connect to Gateway to see real-time activity'}
                    </div>
                )}

                {filteredEvents.map((event, idx) => (
                    <EventCard key={`${event.timestamp}-${idx}`} event={event} />
                ))}
            </div>

            {/* Pulse animation */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Card
// ═══════════════════════════════════════════════════════════════════════════════

function EventCard({ event }: { event: StreamEvent }) {
    const config = EVENT_CONFIG[event.type] ?? { icon: '📌', color: '#94a3b8', label: event.type };
    const time = new Date(event.timestamp).toLocaleTimeString();

    // Extract display-relevant data
    const displayData = getEventDisplayData(event);

    return (
        <div style={{
            display: 'flex',
            gap: '12px',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '10px',
            border: `1px solid rgba(255,255,255,0.05)`,
            borderLeft: `3px solid ${config.color}`,
            animation: 'slideIn 0.3s ease-out',
            transition: 'background 0.2s',
        }}>
            {/* Icon */}
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: `${config.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
            }}>
                {config.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '4px',
                }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: config.color,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        {config.label}
                    </span>
                    <span style={{
                        fontSize: '11px',
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: 'monospace',
                    }}>
                        {time}
                    </span>
                </div>

                {displayData.title && (
                    <div style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.8)',
                        fontWeight: 500,
                        marginBottom: '2px',
                    }}>
                        {displayData.title}
                    </div>
                )}

                {displayData.detail && (
                    <div style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.45)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}>
                        {displayData.detail}
                    </div>
                )}

                {/* Progress bar for progress events */}
                {event.type === 'progress' && typeof event.data['percent'] === 'number' ? (
                    <div style={{
                        marginTop: '6px',
                        height: '4px',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${event.data['percent'] as number}%`,
                            background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
                            borderRadius: '2px',
                            transition: 'width 0.5s ease-out',
                        }} />
                    </div>
                ) : null}

                {/* Duration badge for tool results */}
                {event.type === 'tool_result' && typeof event.data['durationMs'] === 'number' ? (
                    <span style={{
                        display: 'inline-block',
                        marginTop: '4px',
                        fontSize: '11px',
                        color: '#34d399',
                        background: 'rgba(52,211,153,0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                    }}>
                        {(event.data['durationMs'] as number).toFixed(0)}ms
                    </span>
                ) : null}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Display Data Extraction
// ═══════════════════════════════════════════════════════════════════════════════

function getEventDisplayData(event: StreamEvent): { title: string; detail: string } {
    const d = event.data;

    switch (event.type) {
        case 'thinking':
            return {
                title: (d['phase'] as string) ?? 'Reasoning',
                detail: ((d['content'] as string) ?? '').slice(0, 120),
            };
        case 'text':
            return {
                title: (d['isComplete'] as boolean) ? 'Response Complete' : 'Streaming',
                detail: ((d['content'] as string) ?? '').slice(0, 120),
            };
        case 'tool_start':
            return {
                title: `▶ ${d['toolName'] ?? 'Tool'}`,
                detail: (d['description'] as string) ?? JSON.stringify(d['toolArgs'] ?? {}).slice(0, 100),
            };
        case 'tool_result':
            return {
                title: `✓ ${d['toolName'] ?? 'Tool'} completed`,
                detail: d['error'] ? `Error: ${d['error']}` : ((d['resultPreview'] as string) ?? 'Success').slice(0, 100),
            };
        case 'progress':
            return {
                title: (d['step'] as string) ?? 'Step',
                detail: `${d['current'] ?? '?'}/${d['total'] ?? '?'} — ${d['message'] ?? ''}`,
            };
        case 'agent_switch':
            return {
                title: `Switched to ${d['targetAgent'] ?? 'agent'}`,
                detail: (d['reason'] as string) ?? '',
            };
        case 'error':
            return {
                title: (d['message'] as string) ?? 'Error',
                detail: (d['code'] as string) ?? '',
            };
        case 'status':
            return {
                title: (d['type'] as string) ?? 'Status',
                detail: (d['message'] as string) ?? '',
            };
        case 'complete':
            return {
                title: 'Task Complete',
                detail: (d['summary'] as string) ?? '',
            };
        default:
            return { title: event.type, detail: JSON.stringify(d).slice(0, 100) };
    }
}
