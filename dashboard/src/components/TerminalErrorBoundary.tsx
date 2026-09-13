'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary for WebTerminal component.
 * Catches render/lifecycle errors so a terminal crash 
 * doesn't take down the entire page.
 */
export class TerminalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[Terminal] Caught error in boundary:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    className="card card-glass"
                    style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        height: 500,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                    }}
                >
                    <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                    <h3 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        Terminal encountered an error
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 400 }}>
                        {this.state.error?.message || 'An unexpected error occurred in the terminal component.'}
                    </p>
                    <button
                        className="btn-primary"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        style={{ marginTop: '0.5rem' }}
                    >
                        Retry Terminal
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
