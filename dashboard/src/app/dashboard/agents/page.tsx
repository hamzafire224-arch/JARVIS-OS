'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/EmptyState';
import { useErrorToast } from '@/components/ErrorToast';

interface Agent {
    id: string;
    name: string;
    persona: string;
    status: 'idle' | 'training' | 'active' | 'error';
    skills: string[];
    avatar_emoji: string;
    training_progress: number;
    created_at: string;
}

const AVATAR_OPTIONS = ['🤖', '🧠', '💼', '🎯', '🔬', '📊', '🛡️', '🚀'];

export default function AgentsPage() {
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const { showError, showSuccess, ToastContainer } = useErrorToast();

    // Create form state
    const [newName, setNewName] = useState('');
    const [newPersona, setNewPersona] = useState('');
    const [newAvatar, setNewAvatar] = useState('🤖');

    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch('/api/agents');
            if (res.ok) {
                const data = await res.json();
                setAgents(data.agents || []);
            } else {
                showError('Failed to load agents. Please refresh the page.');
            }
        } catch (err) {
            console.error('[Agents] Fetch error:', err);
            showError('Network error — could not reach the server.');
        } finally {
            setLoading(false);
        }
    }, [showError]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const handleCreate = async () => {
        if (!newName.trim() || creating) return;
        setCreating(true);

        try {
            const res = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName.trim(),
                    persona: newPersona.trim(),
                    avatar_emoji: newAvatar,
                }),
            });

            if (res.ok) {
                setShowModal(false);
                setNewName('');
                setNewPersona('');
                setNewAvatar('🤖');
                showSuccess(`Agent "${newName.trim()}" created successfully.`);
                fetchAgents();
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data.error || 'Failed to create agent. Please try again.');
            }
        } catch (err) {
            console.error('[Agents] Create error:', err);
            showError('Network error — could not create agent.');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h1>Your Agents</h1>
                </div>
                <div className="agents-grid">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="agent-card" style={{ opacity: 0.5 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.75rem' }} />
                            <div style={{ width: '60%', height: 16, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.5rem' }} />
                            <div style={{ width: '80%', height: 12, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))' }} />
                        </div>
                    ))}
                </div>
                <ToastContainer />
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                    <h1>Your <span className="text-gradient">Agents</span></h1>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        Create and manage custom AI agents with specialized capabilities
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Agent
                </button>
            </div>

            {/* Agent Grid */}
            {agents.length === 0 ? (
                <div className="card card-glass fade-in-up" style={{ marginTop: '2rem' }}>
                    <EmptyState
                        icon="🤖"
                        title="No agents yet"
                        description="Create your first custom agent to get started. Agents can be trained with specific skills and personas."
                        actionLabel="Create Agent"
                        actionHref="#"
                    />
                </div>
            ) : (
                <div className="agents-grid">
                    {agents.map((agent, i) => (
                        <div
                            key={agent.id}
                            className="agent-card fade-in-up"
                            style={{ animationDelay: `${i * 60}ms` }}
                            onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                        >
                            <div className="agent-avatar">{agent.avatar_emoji}</div>
                            <div className="agent-name">{agent.name}</div>
                            <div className="agent-persona">
                                {agent.persona || 'No persona defined'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span className={`agent-status ${agent.status}`}>
                                    <span style={{
                                        width: 6, height: 6, borderRadius: '50%',
                                        background: agent.status === 'active' ? '#22c55e' :
                                            agent.status === 'training' ? '#00d4ff' :
                                                agent.status === 'error' ? '#ef4444' : '#94a3b8',
                                    }} />
                                    {agent.status}
                                </span>
                                <span className="agent-skills-count">
                                    {agent.skills?.length || 0} skills
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Agent Modal */}
            {showModal && (
                <div className="modal-backdrop" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-title">Create New Agent</div>

                        <div className="modal-field">
                            <label className="modal-label">Name</label>
                            <input
                                className="modal-input"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="e.g., Gummy, Atlas, Sentinel..."
                                maxLength={50}
                                autoFocus
                            />
                        </div>

                        <div className="modal-field">
                            <label className="modal-label">Persona</label>
                            <textarea
                                className="modal-textarea"
                                value={newPersona}
                                onChange={e => setNewPersona(e.target.value)}
                                placeholder="Describe what this agent specializes in..."
                                rows={3}
                            />
                        </div>

                        <div className="modal-field">
                            <label className="modal-label">Avatar</label>
                            <div className="emoji-picker">
                                {AVATAR_OPTIONS.map(emoji => (
                                    <button
                                        key={emoji}
                                        className={`emoji-btn ${newAvatar === emoji ? 'selected' : ''}`}
                                        onClick={() => setNewAvatar(emoji)}
                                        type="button"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-ghost"
                                onClick={() => setShowModal(false)}
                                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreate}
                                disabled={!newName.trim() || creating}
                                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                            >
                                {creating ? 'Creating...' : 'Create Agent'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ToastContainer />
        </div>
    );
}
