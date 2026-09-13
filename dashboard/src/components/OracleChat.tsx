'use client';

import { useState, useRef, useEffect } from 'react';
import { useErrorToast } from '@/components/ErrorToast';

interface OracleMessage {
    role: 'user' | 'oracle';
    text: string;
}

export function OracleChat() {
    const { showError } = useErrorToast();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<OracleMessage[]>([
        { role: 'oracle', text: 'I can answer questions about your JARVIS system. Try asking about your agents, usage stats, or subscription.' },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const sendMessage = async () => {
        const query = input.trim();
        if (!query || isLoading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: query }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/oracle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!res.ok) {
                throw new Error('Failed to query Oracle');
            }

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'oracle', text: data.response || 'No response received.' }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'oracle', text: 'Sorry, I encountered an error. Please try again.' }]);
            showError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) {
        return (
            <button
                className="oracle-trigger"
                onClick={() => setIsOpen(true)}
                aria-label="Open Oracle AI Assistant"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                </svg>
            </button>
        );
    }

    return (
        <div className="oracle-panel">
            {/* Header */}
            <div className="oracle-header">
                <div className="oracle-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-1, #00d4ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2z" />
                    </svg>
                    Oracle
                </div>
                <button className="oracle-close" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {/* Messages */}
            <div className="oracle-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`oracle-msg ${msg.role}`}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && (
                    <div className="oracle-typing">
                        <span /><span /><span />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="oracle-input-area">
                <input
                    ref={inputRef}
                    className="oracle-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your system..."
                    disabled={isLoading}
                />
                <button
                    className="oracle-send"
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
