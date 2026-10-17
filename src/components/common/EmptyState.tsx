import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? 'empty-state--compact' : ''}`}>
      {icon && <span className="empty-state__icon">{icon}</span>}
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__text">{description}</p>}
      {action}
    </div>
  );
}

/** Placeholder rows shown while data loads. Announced once, not repeatedly. */
export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div className="loading-block" role="status" aria-label={label}>
      <div className="skeleton" style={{ height: 18, width: '40%' }} />
      <div className="skeleton" style={{ height: 14, width: '90%' }} />
      <div className="skeleton" style={{ height: 14, width: '75%' }} />
      <div className="skeleton" style={{ height: 14, width: '82%' }} />
    </div>
  );
}
