'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    exiting?: boolean;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
    toast: () => {},
});

export function useToast() {
    return useContext(ToastContext);
}

const iconMap: Record<ToastType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 300);
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Math.random().toString(36).slice(2, 10);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => removeToast(id), 4000);
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <ToastPortal toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
}

function ToastPortal({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
    if (!toasts.length) return null;

    return (
        <div className="toast-container" role="status" aria-live="polite">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type} ${t.exiting ? 'exiting' : ''}`}>
                    <span className="toast-icon">{iconMap[t.type]}</span>
                    <span className="toast-message">{t.message}</span>
                    <button className="toast-close" onClick={() => onClose(t.id)} aria-label="Dismiss">
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
