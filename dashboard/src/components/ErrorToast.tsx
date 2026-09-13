'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'error' | 'success' | 'info';

interface Toast {
    id: number;
    type: ToastType;
    message: string;
    exiting?: boolean;
}

const ICONS: Record<ToastType, string> = { error: '✕', success: '✓', info: 'ℹ' };
const COLORS: Record<ToastType, string> = { error: '#ef4444', success: '#22c55e', info: '#00d4ff' };
const AUTO_DISMISS = 4000;

let idCounter = 0;

export function useErrorToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 300);
    }, []);

    const addToast = useCallback((type: ToastType, message: string) => {
        const id = ++idCounter;
        setToasts(prev => [...prev, { id, type, message }]);
        const timer = setTimeout(() => dismiss(id), AUTO_DISMISS);
        timersRef.current.set(id, timer);
        return id;
    }, [dismiss]);

    // Cleanup timers on unmount
    useEffect(() => {
        const timers = timersRef.current;
        return () => { timers.forEach(t => clearTimeout(t)); };
    }, []);

    const showError = useCallback((msg: string) => addToast('error', msg), [addToast]);
    const showSuccess = useCallback((msg: string) => addToast('success', msg), [addToast]);
    const showInfo = useCallback((msg: string) => addToast('info', msg), [addToast]);

    const ToastContainer = useCallback(() => (
        <>
            <style>{`
                @keyframes toast-in { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes toast-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(120%); opacity: 0; } }
            `}</style>
            <div style={{
                position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                display: 'flex', flexDirection: 'column', gap: '0.5rem',
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.75rem 1rem', borderRadius: 12, minWidth: 280, maxWidth: 420,
                            background: 'rgba(10, 10, 14, 0.85)',
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderLeft: `3px solid ${COLORS[toast.type]}`,
                            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)`,
                            animation: `${toast.exiting ? 'toast-out' : 'toast-in'} 0.3s ease forwards`,
                            pointerEvents: 'auto',
                        }}
                    >
                        <div style={{
                            width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                            background: `${COLORS[toast.type]}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: COLORS[toast.type], fontWeight: 800, fontSize: '0.75rem',
                        }}>
                            {ICONS[toast.type]}
                        </div>
                        <div style={{ flex: 1, fontSize: '0.825rem', color: 'var(--text-primary, #e2e8f0)', lineHeight: 1.4 }}>
                            {toast.message}
                        </div>
                        <button
                            onClick={() => dismiss(toast.id)}
                            style={{
                                background: 'none', border: 'none', color: 'var(--text-tertiary, #64748b)',
                                cursor: 'pointer', fontSize: '1rem', padding: '0 0.25rem', flexShrink: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </>
    ), [toasts, dismiss]);

    return { showError, showSuccess, showInfo, ToastContainer };
}
