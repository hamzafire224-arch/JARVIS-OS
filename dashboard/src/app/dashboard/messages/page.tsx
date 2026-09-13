'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceSphere } from '@/components/VoiceSphere';
import { GuardrailModal } from '@/components/GuardrailModal';
import { useErrorToast } from '@/components/ErrorToast';

/**
 * Omnichannel Messages Hub
 *
 * Central inbox pulling real data from omnichannel_messages (Supabase).
 * Features: channel filter tabs, conversation thread view, VoiceSphere
 * in the header, and guardrail modal integration.
 */

interface Message {
    id: string;
    channel: string;
    direction: 'inbound' | 'outbound';
    sender_id: string;
    sender_name: string;
    body: string;
    media_url: string | null;
    media_type: string | null;
    status: string;
    created_at: string;
    metadata: Record<string, unknown>;
}

interface PermissionRequest {
    id: string;
    agent_id: string | null;
    action_type: string;
    action_summary: string;
    action_payload: Record<string, unknown>;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    status: 'pending' | 'approved' | 'denied' | 'expired' | 'auto_approved';
    expires_at: string;
    created_at: string;
}

interface ConversationThread {
    sender_id: string;
    sender_name: string;
    channel: string;
    lastMessage: string;
    lastTime: string;
    unread: number;
    messages: Message[];
}

const CHANNEL_TABS = [
    { key: 'all', label: 'All', icon: '📥' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { key: 'instagram', label: 'Instagram', icon: '📸' },
    { key: 'telegram', label: 'Telegram', icon: '✈️' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'sms', label: 'SMS', icon: '📱' },
];

const CHANNEL_COLORS: Record<string, string> = {
    whatsapp: '#25D366',
    instagram: '#E4405F',
    telegram: '#0088cc',
    email: '#00d4ff',
    sms: '#a855f7',
    web: '#94a3b8',
};

export default function MessagesPage() {
    const { showError } = useErrorToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [channel, setChannel] = useState('all');
    const [selectedThread, setSelectedThread] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [guardrailRequest, setGuardrailRequest] = useState<PermissionRequest | null>(null);
    const [showGuardrail, setShowGuardrail] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch messages from API
    const fetchMessages = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (channel !== 'all') params.set('channel', channel);

            const res = await fetch(`/api/messages?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } catch (err) {
            showError(err instanceof Error ? err.message : 'An error occurred');
            // API might not exist yet — that's fine for initial render
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [channel, showError]);

    useEffect(() => {
        fetchMessages();
        // Poll for new messages every 10s
        const interval = setInterval(fetchMessages, 10000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    // Check for pending guardrail requests
    useEffect(() => {
        const checkGuardrails = async () => {
            try {
                const res = await fetch('/api/guardrails/pending');
                if (res.ok) {
                    const data = await res.json();
                    if (data.requests?.length > 0) {
                        setGuardrailRequest(data.requests[0]);
                        setShowGuardrail(true);
                    }
                }
            } catch (err) {
                showError(err instanceof Error ? err.message : 'An error occurred');
                // Silently fail
            }
        };
        checkGuardrails();
        const interval = setInterval(checkGuardrails, 15000);
        return () => clearInterval(interval);
    }, []);

    // Scroll to bottom of thread
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedThread, messages]);

    // Group messages into conversation threads
    const threads: ConversationThread[] = (() => {
        const map = new Map<string, ConversationThread>();
        for (const msg of messages) {
            const key = `${msg.channel}:${msg.sender_id}`;
            if (!map.has(key)) {
                map.set(key, {
                    sender_id: msg.sender_id,
                    sender_name: msg.sender_name || msg.sender_id,
                    channel: msg.channel,
                    lastMessage: msg.body,
                    lastTime: msg.created_at,
                    unread: msg.status === 'received' ? 1 : 0,
                    messages: [msg],
                });
            } else {
                const thread = map.get(key)!;
                thread.messages.push(msg);
                if (msg.created_at > thread.lastTime) {
                    thread.lastMessage = msg.body;
                    thread.lastTime = msg.created_at;
                }
                if (msg.status === 'received') thread.unread++;
            }
        }
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
        );
    })();

    const activeThread = threads.find(t => `${t.channel}:${t.sender_id}` === selectedThread);

    const handleGuardrailDecision = async (requestId: string, decision: 'approved' | 'denied') => {
        try {
            await fetch('/api/guardrails/decide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, decision }),
            });
        } catch (err) {
            showError(err instanceof Error ? err.message : 'An error occurred');
            // Silently fail
        } finally {
            setShowGuardrail(false);
            setGuardrailRequest(null);
        }
    };

    const toggleVoice = () => setIsSpeaking(prev => !prev);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div>
            {/* Header with VoiceSphere */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '1.5rem',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                        onClick={toggleVoice}
                        style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
                        title={isSpeaking ? 'Deactivate Voice' : 'Activate Voice'}
                    >
                        <VoiceSphere isSpeaking={isSpeaking} size={48} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>
                            Message <span className="text-gradient">Hub</span>
                        </h1>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.825rem', margin: '0.2rem 0 0' }}>
                            {messages.length > 0
                                ? `${messages.length} message${messages.length !== 1 ? 's' : ''} across ${new Set(messages.map(m => m.channel)).size} channel${new Set(messages.map(m => m.channel)).size !== 1 ? 's' : ''}`
                                : 'Connect your channels to start receiving messages'
                            }
                        </p>
                    </div>
                </div>

                {/* Connection Status Dots */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {['whatsapp', 'instagram', 'telegram'].map(ch => {
                        const hasMessages = messages.some(m => m.channel === ch);
                        return (
                            <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: hasMessages ? CHANNEL_COLORS[ch] : 'rgba(255,255,255,0.1)',
                                    boxShadow: hasMessages ? `0 0 8px ${CHANNEL_COLORS[ch]}50` : 'none',
                                }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>
                                    {ch}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Channel Tabs */}
            <div className="marketplace-tabs" style={{ marginBottom: '1.25rem', marginTop: 0 }}>
                {CHANNEL_TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`marketplace-tab ${channel === tab.key ? 'active' : ''}`}
                        onClick={() => { setChannel(tab.key); setSelectedThread(null); }}
                    >
                        <span style={{ marginRight: '0.375rem' }}>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main Content: Thread List + Conversation */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: selectedThread ? '320px 1fr' : '1fr',
                gap: '1rem',
                minHeight: 500,
            }}>
                {/* Thread List */}
                <div style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    borderRadius: 14,
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                }}>
                    <div style={{
                        padding: '0.875rem 1rem',
                        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        fontSize: '0.8rem', fontWeight: 600,
                        color: 'var(--text-secondary)',
                    }}>
                        Conversations ({threads.length})
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} style={{
                                    padding: '0.875rem 1rem',
                                    borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))',
                                    display: 'flex', gap: '0.75rem', alignItems: 'center',
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ width: '60%', height: 12, borderRadius: 3, background: 'rgba(255,255,255,0.04)', marginBottom: 6 }} />
                                        <div style={{ width: '80%', height: 10, borderRadius: 3, background: 'rgba(255,255,255,0.03)' }} />
                                    </div>
                                </div>
                            ))
                        ) : threads.length === 0 ? (
                            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: '0.375rem' }}>
                                    No conversations yet
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                                    Messages from WhatsApp, Instagram, and other channels will appear here once your Meta webhook is connected.
                                </div>
                            </div>
                        ) : (
                            threads.map(thread => {
                                const key = `${thread.channel}:${thread.sender_id}`;
                                const isSelected = selectedThread === key;
                                return (
                                    <div
                                        key={key}
                                        onClick={() => setSelectedThread(key)}
                                        style={{
                                            padding: '0.875rem 1rem',
                                            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.04))',
                                            cursor: 'pointer',
                                            background: isSelected ? 'rgba(0, 212, 255, 0.06)' : 'transparent',
                                            borderLeft: isSelected ? '3px solid var(--accent-1, #00d4ff)' : '3px solid transparent',
                                            transition: 'all 0.15s ease',
                                            display: 'flex', gap: '0.75rem', alignItems: 'center',
                                        }}
                                    >
                                        {/* Avatar */}
                                        <div style={{
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: `${CHANNEL_COLORS[thread.channel] || '#94a3b8'}20`,
                                            border: `1.5px solid ${CHANNEL_COLORS[thread.channel] || '#94a3b8'}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.95rem', fontWeight: 700,
                                            color: CHANNEL_COLORS[thread.channel] || '#94a3b8',
                                            flexShrink: 0,
                                        }}>
                                            {thread.sender_name.charAt(0).toUpperCase()}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                                <span style={{
                                                    fontWeight: 600, fontSize: '0.825rem',
                                                    color: 'var(--text-primary)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {thread.sender_name}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: '0.5rem' }}>
                                                    {formatTime(thread.lastTime)}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                                <span style={{
                                                    fontSize: '0.6rem', padding: '0.1rem 0.35rem',
                                                    borderRadius: 4, fontWeight: 600,
                                                    background: `${CHANNEL_COLORS[thread.channel] || '#94a3b8'}15`,
                                                    color: CHANNEL_COLORS[thread.channel] || '#94a3b8',
                                                    textTransform: 'uppercase', letterSpacing: '0.03em',
                                                }}>
                                                    {thread.channel}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.75rem', color: 'var(--text-tertiary)',
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                }}>
                                                    {thread.lastMessage}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Unread badge */}
                                        {thread.unread > 0 && (
                                            <span style={{
                                                width: 20, height: 20, borderRadius: '50%',
                                                background: 'var(--accent-1, #00d4ff)',
                                                color: '#000', fontSize: '0.65rem', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {thread.unread > 9 ? '9+' : thread.unread}
                                            </span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Conversation View */}
                {selectedThread && (
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        borderRadius: 14,
                        display: 'flex', flexDirection: 'column',
                        overflow: 'hidden',
                    }}>
                        {/* Thread Header */}
                        {activeThread && (
                            <div style={{
                                padding: '0.875rem 1.25rem',
                                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <button
                                        onClick={() => setSelectedThread(null)}
                                        style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-tertiary)', padding: '0.25rem',
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="15 18 9 12 15 6" />
                                        </svg>
                                    </button>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                            {activeThread.sender_name}
                                        </div>
                                        <div style={{
                                            fontSize: '0.7rem', color: CHANNEL_COLORS[activeThread.channel],
                                            textTransform: 'capitalize',
                                        }}>
                                            via {activeThread.channel}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 99,
                                    background: `${CHANNEL_COLORS[activeThread.channel]}15`,
                                    color: CHANNEL_COLORS[activeThread.channel],
                                    fontWeight: 600, textTransform: 'uppercase',
                                }}>
                                    {activeThread.messages.length} msg{activeThread.messages.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        )}

                        {/* Messages */}
                        <div style={{
                            flex: 1, overflowY: 'auto', padding: '1.25rem',
                            display: 'flex', flexDirection: 'column', gap: '0.625rem',
                        }}>
                            {activeThread?.messages
                                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                                .map(msg => (
                                    <div
                                        key={msg.id}
                                        style={{
                                            alignSelf: msg.direction === 'outbound' ? 'flex-end' : 'flex-start',
                                            maxWidth: '75%',
                                        }}
                                    >
                                        <div style={{
                                            padding: '0.6rem 0.9rem',
                                            borderRadius: 14,
                                            borderBottomLeftRadius: msg.direction === 'inbound' ? 4 : 14,
                                            borderBottomRightRadius: msg.direction === 'outbound' ? 4 : 14,
                                            background: msg.direction === 'outbound'
                                                ? 'var(--accent-1, #00d4ff)'
                                                : 'rgba(255,255,255,0.05)',
                                            color: msg.direction === 'outbound' ? '#000' : 'var(--text-primary)',
                                            fontSize: '0.825rem',
                                            lineHeight: 1.5,
                                        }}>
                                            {msg.body}
                                        </div>
                                        <div style={{
                                            fontSize: '0.6rem', color: 'var(--text-tertiary)',
                                            marginTop: '0.25rem',
                                            textAlign: msg.direction === 'outbound' ? 'right' : 'left',
                                            padding: '0 0.25rem',
                                        }}>
                                            {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input (placeholder for future implementation) */}
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                            display: 'flex', gap: '0.5rem',
                        }}>
                            <input
                                placeholder="Reply via JARVIS..."
                                style={{
                                    flex: 1, padding: '0.65rem 0.9rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                                    borderRadius: 10, color: 'var(--text-primary)',
                                    fontSize: '0.825rem', outline: 'none',
                                }}
                                disabled
                            />
                            <button
                                style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'var(--accent-1, #00d4ff)',
                                    border: 'none', cursor: 'not-allowed',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0.5,
                                }}
                                disabled
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Guardrail Modal */}
            <GuardrailModal
                isOpen={showGuardrail}
                onClose={() => setShowGuardrail(false)}
                request={guardrailRequest}
                onDecision={handleGuardrailDecision}
            />
        </div>
    );
}
