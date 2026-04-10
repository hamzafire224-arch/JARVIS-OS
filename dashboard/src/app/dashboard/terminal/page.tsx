'use client';

import { WebTerminal } from '@/components/WebTerminal';
import { useState } from 'react';

export default function TerminalPage() {
    const defaultGateway = 'ws://localhost:3001';
    const [gatewayUrl, setGatewayUrl] = useState(defaultGateway);
    const [authToken, setAuthToken] = useState('');
    const [showConfig, setShowConfig] = useState(false);

    return (
        <>
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>Terminal</h1>
                        <p>Remote access to your local JARVIS instance.</p>
                    </div>
                    <button
                        className="btn-ghost"
                        onClick={() => setShowConfig(!showConfig)}
                        style={{ fontSize: '0.85rem' }}
                    >
                        ⚙️ Configure
                    </button>
                </div>
            </div>

            <div className="dashboard-content">
                {showConfig && (
                    <div className="card card-glass" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label htmlFor="gateway-url" style={{ fontSize: '0.8rem' }}>Gateway URL</label>
                                <input
                                    id="gateway-url"
                                    type="text"
                                    className="form-input"
                                    value={gatewayUrl}
                                    onChange={(e) => setGatewayUrl(e.target.value)}
                                    placeholder="ws://localhost:3001"
                                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label htmlFor="auth-token" style={{ fontSize: '0.8rem' }}>Auth Token (optional)</label>
                                <input
                                    id="auth-token"
                                    type="password"
                                    className="form-input"
                                    value={authToken}
                                    onChange={(e) => setAuthToken(e.target.value)}
                                    placeholder="GATEWAY_AUTH_TOKEN"
                                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.75rem' }}>
                            Start the Gateway server locally: <code style={{
                                color: 'var(--accent-1)',
                                background: 'var(--bg-tertiary)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: 4,
                            }}>jarvis gateway start</code> or <code style={{
                                color: 'var(--accent-1)',
                                background: 'var(--bg-tertiary)',
                                padding: '0.15rem 0.4rem',
                                borderRadius: 4,
                            }}>node dist/gateway-server.js</code>
                        </p>
                    </div>
                )}

                {/* Security Notice */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'rgba(245, 158, 11, 0.06)',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1rem',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                }}>
                    <span style={{ fontSize: '1rem' }}>🔒</span>
                    <span>
                        Terminal connects directly to your local machine via the JARVIS Gateway.
                        Enable remote terminal in your CLI config: <code style={{ color: 'var(--accent-1)' }}>remoteTerminal: true</code>
                    </span>
                </div>

                <WebTerminal
                    gatewayUrl={gatewayUrl}
                    authToken={authToken || undefined}
                />
            </div>
        </>
    );
}
