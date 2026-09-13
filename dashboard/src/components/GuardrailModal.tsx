'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * GuardrailModal — High-stakes action approval gate
 *
 * Pops up when an agent attempts a sensitive action (send message,
 * delete data, financial transaction, etc.). Fetches pending
 * permission_requests from Supabase and lets the user approve/deny.
 *
 * Glass-morphic, cinematic design with risk-level color coding.
 */

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

interface GuardrailModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: PermissionRequest | null;
    onDecision: (requestId: string, decision: 'approved' | 'denied') => void;
}

const RISK_CONFIG = {
    low: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.08)', border: 'rgba(34, 197, 94, 0.25)', label: 'Low Risk', icon: '✓' },
    medium: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', label: 'Medium Risk', icon: '⚠' },
    high: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', label: 'High Risk', icon: '⚠' },
    critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.4)', label: 'Critical', icon: '⛔' },
};

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
    send_message: { label: 'Send Message', icon: '📤' },
    delete_data: { label: 'Delete Data', icon: '🗑️' },
    financial_transaction: { label: 'Financial Transaction', icon: '💳' },
    api_call: { label: 'External API Call', icon: '🔗' },
    file_write: { label: 'File Modification', icon: '📝' },
    system_config: { label: 'System Configuration', icon: '⚙️' },
    escalation: { label: 'Escalation', icon: '🚨' },
    custom: { label: 'Custom Action', icon: '⚡' },
};

export function GuardrailModal({ isOpen, onClose, request, onDecision }: GuardrailModalProps) {
    const [deciding, setDeciding] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    // Countdown timer
    useEffect(() => {
        if (!request || !isOpen) return;

        const update = () => {
            const expires = new Date(request.expires_at).getTime();
            const now = Date.now();
            const diff = Math.max(0, expires - now);
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);

            if (diff <= 0) {
                setTimeLeft('Expired');
            }
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [request, isOpen]);

    const handleDecision = useCallback(async (decision: 'approved' | 'denied') => {
        if (!request || deciding) return;
        setDeciding(true);
        try {
            onDecision(request.id, decision);
        } finally {
            setDeciding(false);
        }
    }, [request, deciding, onDecision]);

    if (!isOpen || !request) return null;

    const risk = RISK_CONFIG[request.risk_level] || RISK_CONFIG.medium;
    const action = ACTION_LABELS[request.action_type] || ACTION_LABELS.custom;
    const isExpired = timeLeft === 'Expired';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 2000,
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fade-in 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '90%', maxWidth: 500,
                    background: 'rgba(12, 12, 20, 0.92)',
                    border: `1px solid ${risk.border}`,
                    borderRadius: 20,
                    padding: 0,
                    boxShadow: `0 0 60px ${risk.bg}, 0 24px 48px rgba(0,0,0,0.5)`,
                    animation: 'modal-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Risk Banner */}
                <div style={{
                    background: risk.bg,
                    borderBottom: `1px solid ${risk.border}`,
                    padding: '1rem 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{risk.icon}</span>
                        <span style={{
                            fontWeight: 700, fontSize: '0.85rem',
                            color: risk.color, textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {risk.label}
                        </span>
                    </div>
                    <div style={{
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: '0.8rem', fontWeight: 600,
                        color: isExpired ? '#ef4444' : 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                        {timeLeft}
                    </div>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem 1.75rem' }}>
                    {/* Action Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: 'rgba(0, 212, 255, 0.08)',
                            border: '1px solid rgba(0, 212, 255, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem',
                        }}>
                            {action.icon}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary, #fff)' }}>
                                Permission Required
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary, #888)', marginTop: '0.125rem' }}>
                                {action.label}
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        borderRadius: 12, padding: '1rem 1.25rem',
                        marginBottom: '1.25rem',
                    }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary, #888)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Action Summary
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary, #fff)', lineHeight: 1.6 }}>
                            {request.action_summary}
                        </div>
                    </div>

                    {/* Payload Preview */}
                    {Object.keys(request.action_payload).length > 0 && (
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                            borderRadius: 10, padding: '0.75rem 1rem',
                            marginBottom: '1.5rem',
                            maxHeight: 120, overflowY: 'auto',
                        }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary, #888)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Payload
                            </div>
                            <pre style={{
                                fontSize: '0.7rem', color: 'var(--text-secondary, #ccc)',
                                fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                            }}>
                                {JSON.stringify(request.action_payload, null, 2)}
                            </pre>
                        </div>
                    )}

                    {/* Decision Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={() => handleDecision('denied')}
                            disabled={deciding || isExpired}
                            style={{
                                flex: 1, padding: '0.75rem',
                                borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#ef4444', fontWeight: 600, fontSize: '0.875rem',
                                cursor: deciding || isExpired ? 'not-allowed' : 'pointer',
                                opacity: deciding || isExpired ? 0.5 : 1,
                                transition: 'all 0.2s ease',
                            }}
                        >
                            Deny
                        </button>
                        <button
                            onClick={() => handleDecision('approved')}
                            disabled={deciding || isExpired}
                            style={{
                                flex: 1, padding: '0.75rem',
                                borderRadius: 12, border: 'none',
                                background: request.risk_level === 'critical'
                                    ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                                    : 'linear-gradient(135deg, #00d4ff, #0099cc)',
                                color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                                cursor: deciding || isExpired ? 'not-allowed' : 'pointer',
                                opacity: deciding || isExpired ? 0.5 : 1,
                                transition: 'all 0.2s ease',
                                boxShadow: request.risk_level === 'critical'
                                    ? '0 4px 20px rgba(220, 38, 38, 0.3)'
                                    : '0 4px 20px rgba(0, 212, 255, 0.2)',
                            }}
                        >
                            {deciding ? 'Processing...' :
                                request.risk_level === 'critical' ? 'Approve (Critical)' : 'Approve'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuardrailModal;
