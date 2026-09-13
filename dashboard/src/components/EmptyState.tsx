import Link from 'next/link';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
}

export function EmptyState({ icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <div className="empty-state-title">{title}</div>
            <div className="empty-state-desc">{description}</div>
            {actionLabel && actionHref && (
                <Link href={actionHref}>
                    <button className="btn-primary" style={{ maxWidth: 200, fontSize: '0.875rem', padding: '0.65rem 1.25rem' }}>
                        {actionLabel}
                    </button>
                </Link>
            )}
        </div>
    );
}
