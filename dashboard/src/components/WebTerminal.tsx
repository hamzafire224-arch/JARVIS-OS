'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * WebTerminal — Interactive terminal connected to JARVIS Gateway
 * Uses a simple text-based terminal since xterm.js is a heavy dependency.
 * For production, replace with proper xterm.js integration.
 */

interface WebTerminalProps {
    gatewayUrl: string;
    authToken?: string;
}

interface TerminalLine {
    id: string;
    type: 'input' | 'output' | 'error' | 'system';
    content: string;
    timestamp: Date;
}

export function WebTerminal({ gatewayUrl, authToken }: WebTerminalProps) {
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [input, setInput] = useState('');
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const addLine = useCallback((type: TerminalLine['type'], content: string) => {
        setLines(prev => [...prev, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type,
            content,
            timestamp: new Date(),
        }]);
    }, []);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setConnecting(true);
        addLine('system', `Connecting to ${gatewayUrl}...`);

        try {
            const ws = new WebSocket(gatewayUrl);

            ws.onopen = () => {
                setConnected(true);
                setConnecting(false);
                addLine('system', '✓ Connected to JARVIS Gateway');

                // Authenticate if token provided
                if (authToken) {
                    ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'auth',
                        params: { token: authToken },
                        id: 'auth-1',
                    }));
                }

                // Request terminal session
                ws.send(JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'terminal.start',
                    params: {},
                    id: 'terminal-start',
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);

                    if (msg.method === 'terminal.output') {
                        addLine('output', msg.params?.data ?? '');
                    } else if (msg.error) {
                        addLine('error', msg.error.message ?? 'Unknown error');
                    } else if (msg.result && msg.id === 'auth-1') {
                        addLine('system', '🔐 Authenticated');
                    }
                } catch {
                    addLine('output', event.data);
                }
            };

            ws.onclose = () => {
                setConnected(false);
                setConnecting(false);
                addLine('system', '✗ Disconnected from Gateway');
                wsRef.current = null;
            };

            ws.onerror = () => {
                setConnecting(false);
                addLine('error', 'Connection failed. Is the Gateway server running?');
            };

            wsRef.current = ws;
        } catch (err) {
            setConnecting(false);
            addLine('error', `Failed to connect: ${err}`);
        }
    }, [gatewayUrl, authToken, addLine]);

    const sendCommand = useCallback((cmd: string) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            addLine('error', 'Not connected to Gateway');
            return;
        }

        addLine('input', `$ ${cmd}`);
        setCommandHistory(prev => [...prev, cmd]);
        setHistoryIndex(-1);

        wsRef.current.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'terminal.input',
            params: { data: cmd + '\n' },
            id: `cmd-${Date.now()}`,
        }));
    }, [addLine]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            sendCommand(input.trim());
            setInput('');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length > 0) {
                const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex] ?? '');
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex >= 0) {
                const newIndex = historyIndex + 1;
                if (newIndex >= commandHistory.length) {
                    setHistoryIndex(-1);
                    setInput('');
                } else {
                    setHistoryIndex(newIndex);
                    setInput(commandHistory[newIndex] ?? '');
                }
            }
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    // Focus input on click
    useEffect(() => {
        inputRef.current?.focus();
    }, [connected]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    const lineColors: Record<TerminalLine['type'], string> = {
        input: 'var(--accent-1)',
        output: 'var(--text-primary)',
        error: 'var(--error)',
        system: 'var(--text-tertiary)',
    };

    return (
        <div
            className="card card-glass"
            style={{
                padding: 0,
                overflow: 'hidden',
                height: isFullscreen ? 'calc(100vh - 3rem)' : 500,
                display: 'flex',
                flexDirection: 'column',
                transition: 'height 0.3s ease',
            }}
        >
            {/* Terminal Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Traffic light dots */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: connected ? '#22c55e' : '#ef4444' }} />
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                        JARVIS Terminal — {connected ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!connected && (
                        <button
                            className="btn-ghost"
                            onClick={connect}
                            disabled={connecting}
                            style={{ fontSize: '0.8rem' }}
                        >
                            {connecting ? '⏳ Connecting...' : '🔌 Connect'}
                        </button>
                    )}
                    {connected && (
                        <button
                            className="btn-ghost"
                            onClick={() => wsRef.current?.close()}
                            style={{ fontSize: '0.8rem' }}
                        >
                            ✗ Disconnect
                        </button>
                    )}
                    <button
                        className="btn-ghost"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        style={{ fontSize: '0.8rem' }}
                    >
                        {isFullscreen ? '⊡' : '⊞'}
                    </button>
                    <button
                        className="btn-ghost"
                        onClick={() => setLines([])}
                        style={{ fontSize: '0.8rem' }}
                    >
                        ⌫ Clear
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                onClick={() => inputRef.current?.focus()}
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '1rem',
                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                    fontSize: '0.85rem',
                    lineHeight: 1.7,
                    background: 'var(--bg-primary)',
                    cursor: 'text',
                }}
            >
                {lines.length === 0 && !connected && (
                    <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', paddingTop: '2rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚡</div>
                        <p>Connect to your local JARVIS Gateway to start a terminal session.</p>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                            Start the gateway: <code style={{ color: 'var(--accent-1)', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>jarvis gateway start</code>
                        </p>
                    </div>
                )}

                {lines.map((line) => (
                    <div key={line.id} style={{ color: lineColors[line.type], whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {line.type === 'system' && <span style={{ opacity: 0.5 }}>{'// '}</span>}
                        {line.content}
                    </div>
                ))}

                {/* Input Line */}
                {connected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ color: 'var(--accent-1)', fontWeight: 600 }}>$</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-primary)',
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                caretColor: 'var(--accent-1)',
                            }}
                            autoFocus
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
