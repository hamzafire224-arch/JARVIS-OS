'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import TrainingCinematic from '@/components/TrainingCinematic';
import { useErrorToast } from '@/components/ErrorToast';
import Link from 'next/link';

interface Agent {
    id: string;
    name: string;
    persona: string;
    system_prompt: string;
    status: 'idle' | 'training' | 'active' | 'error';
    skills: string[];
    avatar_emoji: string;
    training_progress: number;
    created_at: string;
    updated_at: string;
}

const AVAILABLE_SKILLS = [
    { name: 'GitHub', icon: '🐙' },
    { name: 'Browser', icon: '🌐' },
    { name: 'Database', icon: '🗃️' },
    { name: 'Terminal', icon: '⚡' },
    { name: 'Email', icon: '📧' },
    { name: 'Calendar', icon: '📅' },
    { name: 'Vision', icon: '👁️' },
    { name: 'Web Scraper', icon: '🕸️' },
];

export default function AgentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [agent, setAgent] = useState<Agent | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const trainingRef = useRef<NodeJS.Timeout | null>(null);
    const { showError, showSuccess, showInfo, ToastContainer } = useErrorToast();

    const fetchAgent = useCallback(async () => {
        try {
            const res = await fetch(`/api/agents/${id}`);
            if (res.ok) {
                const data = await res.json();
                setAgent(data.agent || data);
            } else {
                showError('Agent not found or access denied.');
                router.push('/dashboard/agents');
            }
        } catch (err) {
            console.error('[AgentDetail] Fetch error:', err);
            showError('Network error — could not load agent details.');
            router.push('/dashboard/agents');
        } finally {
            setLoading(false);
        }
    }, [id, router, showError]);

    useEffect(() => {
        fetchAgent();
    }, [fetchAgent]);

    // Training simulation
    useEffect(() => {
        if (agent?.status === 'training') {
            trainingRef.current = setInterval(async () => {
                setAgent(prev => {
                    if (!prev) return prev;
                    const newProgress = Math.min(prev.training_progress + 1, 100);
                    if (newProgress >= 100) {
                        // Training complete
                        clearInterval(trainingRef.current!);
                        fetch(`/api/agents/${id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'active', training_progress: 100 }),
                        }).catch(() => {});
                        return { ...prev, status: 'active', training_progress: 100 };
                    }
                    return { ...prev, training_progress: newProgress };
                });
            }, 300);
        }

        return () => {
            if (trainingRef.current) clearInterval(trainingRef.current);
        };
    }, [agent?.status, id]);

    const updateField = async (field: string, value: string | string[]) => {
        if (!agent) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/agents/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
            if (res.ok) {
                const data = await res.json();
                setAgent(data.agent || { ...agent, [field]: value });
            } else {
                showError(`Failed to update ${field}. Please try again.`);
            }
        } catch (err) {
            console.error('[AgentDetail] Update error:', err);
            showError('Network error — changes could not be saved.');
        } finally {
            setSaving(false);
        }
    };

    const startTraining = async () => {
        try {
            const res = await fetch(`/api/agents/${id}/train`, { method: 'POST' });
            if (res.ok) {
                setAgent(prev => prev ? { ...prev, status: 'training', training_progress: 0 } : prev);
                showInfo('Training sequence initiated...');
            } else {
                showError('Failed to start training. Please try again.');
            }
        } catch (err) {
            console.error('[AgentDetail] Train error:', err);
            showError('Network error — could not start training.');
        }
    };

    const deleteAgent = async () => {
        try {
            const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showSuccess('Agent deleted.');
                router.push('/dashboard/agents');
            } else {
                showError('Failed to delete agent. Please try again.');
            }
        } catch (err) {
            console.error('[AgentDetail] Delete error:', err);
            showError('Network error — could not delete agent.');
        }
    };

    const toggleSkill = (skillName: string) => {
        if (!agent) return;
        const skills = agent.skills || [];
        const updated = skills.includes(skillName)
            ? skills.filter(s => s !== skillName)
            : [...skills, skillName];
        updateField('skills', updated);
        setAgent(prev => prev ? { ...prev, skills: updated } : prev);
    };

    if (loading) {
        return (
            <div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ width: 150, height: 14, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '1.5rem' }} />
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '1rem' }} />
                    <div style={{ width: '40%', height: 24, borderRadius: 4, background: 'var(--border-subtle, rgba(255,255,255,0.06))', marginBottom: '0.75rem' }} />
                    <div style={{ width: '70%', height: 60, borderRadius: 8, background: 'var(--border-subtle, rgba(255,255,255,0.06))' }} />
                </div>
                <ToastContainer />
            </div>
        );
    }

    if (!agent) return null;

    return (
        <div>
            {/* Back */}
            <Link
                href="/dashboard/agents"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                    color: 'var(--text-tertiary)', fontSize: '0.825rem', marginBottom: '1.5rem',
                    textDecoration: 'none',
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to Agents
            </Link>

            {/* Agent Header */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                    <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>{agent.avatar_emoji}</div>
                    <div style={{ flex: 1 }}>
                        <input
                            style={{
                                background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                                color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: 700,
                                width: '100%', padding: '0.25rem 0', outline: 'none',
                                transition: 'border-color 0.2s ease',
                            }}
                            value={agent.name}
                            onChange={e => setAgent({ ...agent, name: e.target.value })}
                            onBlur={() => updateField('name', agent.name)}
                            onFocus={e => (e.target.style.borderBottomColor = 'var(--accent-1, #00d4ff)')}
                            onBlurCapture={e => (e.target.style.borderBottomColor = 'transparent')}
                        />
                        <textarea
                            style={{
                                background: 'transparent', border: 'none', borderBottom: '1px solid transparent',
                                color: 'var(--text-secondary)', fontSize: '0.875rem', width: '100%',
                                padding: '0.5rem 0', outline: 'none', resize: 'none', fontFamily: 'inherit',
                                minHeight: 50, lineHeight: 1.5,
                                transition: 'border-color 0.2s ease',
                            }}
                            value={agent.persona}
                            onChange={e => setAgent({ ...agent, persona: e.target.value })}
                            onBlur={() => updateField('persona', agent.persona)}
                            placeholder="Describe this agent's persona..."
                        />
                        {saving && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-1, #00d4ff)', opacity: 0.7 }}>Saving...</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Training / Status Section — CINEMATIC UPGRADE */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '100ms' }}>
                <div className="card-header">
                    <h3 className="card-title">Training Status</h3>
                </div>

                {agent.status === 'idle' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                            This agent hasn&apos;t been trained yet. Start training to activate it.
                        </p>
                        <button
                            className="btn-primary"
                            onClick={startTraining}
                            style={{ padding: '0.7rem 2rem', fontSize: '0.9rem' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                                Start Training
                            </span>
                        </button>
                    </div>
                )}

                {agent.status === 'training' && (
                    <TrainingCinematic progress={agent.training_progress} />
                )}

                {agent.status === 'active' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1.5rem', borderRadius: 99,
                            background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e',
                            fontWeight: 600, fontSize: '0.9rem',
                        }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', animation: 'pulse-glow 2s ease-in-out infinite' }} />
                            Active &amp; Ready
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                            This agent is fully trained and ready to handle tasks.
                        </p>
                    </div>
                )}

                {agent.status === 'error' && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.5rem 1.5rem', borderRadius: 99,
                            background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
                            fontWeight: 600, fontSize: '0.9rem',
                        }}>
                            Error
                        </div>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                            Training failed. Try again.
                        </p>
                        <button className="btn-primary" onClick={startTraining} style={{ marginTop: '1rem', padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
                            Retry Training
                        </button>
                    </div>
                )}
            </div>

            {/* Skills Section */}
            <div className="card card-glass fade-in-up" style={{ marginBottom: '1.5rem', animationDelay: '200ms' }}>
                <div className="card-header">
                    <h3 className="card-title">Assigned Skills</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {agent.skills?.length || 0} / {AVAILABLE_SKILLS.length} active
                    </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {AVAILABLE_SKILLS.map(skill => {
                        const isActive = agent.skills?.includes(skill.name);
                        return (
                            <button
                                key={skill.name}
                                onClick={() => toggleSkill(skill.name)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                                    padding: '0.45rem 0.85rem', borderRadius: 99,
                                    border: `1px solid ${isActive ? 'var(--accent-1, #00d4ff)' : 'var(--border-subtle, rgba(255,255,255,0.08))'}`,
                                    background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                                    color: isActive ? 'var(--accent-1, #00d4ff)' : 'var(--text-secondary)',
                                    fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <span>{skill.icon}</span>
                                {skill.name}
                                {isActive && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card fade-in-up" style={{
                border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 12,
                padding: '1.25rem 1.5rem', animationDelay: '300ms',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontWeight: 600, color: '#ef4444', fontSize: '0.9rem' }}>Danger Zone</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                            Permanently delete this agent and all its data.
                        </div>
                    </div>
                    {!showDelete ? (
                        <button
                            onClick={() => setShowDelete(true)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: 8,
                                border: '1px solid rgba(239, 68, 68, 0.3)', background: 'transparent',
                                color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Delete Agent
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowDelete(false)}
                                className="btn-ghost"
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={deleteAgent}
                                style={{
                                    padding: '0.5rem 1rem', borderRadius: 8, border: 'none',
                                    background: '#ef4444', color: '#fff', fontSize: '0.8rem',
                                    fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                Confirm Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <ToastContainer />
        </div>
    );
}
