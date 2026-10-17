import type { ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  /** Removes padding, used for tables that sit flush with the card edge. */
  flush?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
  headingId?: string;
}

/** Standard panel: optional title, description, actions and footer. */
export function SectionCard({ title, description, actions, footer, icon, flush, id, className, children, headingId }: SectionCardProps) {
  const classes = ['card', flush && 'card--flush', className].filter(Boolean).join(' ');
  return (
    <section className={classes} id={id} aria-labelledby={headingId}>
      {(title || description || actions) && (
        <div className="card__header" style={flush ? { padding: 'var(--space-5) var(--space-5) 0' } : undefined}>
          <div>
            {title && (
              <h2 className="card__title" id={headingId}>
                {icon}
                {title}
              </h2>
            )}
            {description && <p className="card__description">{description}</p>}
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      {flush ? <div>{children}</div> : children}
      {footer && <div className="card__footer">{footer}</div>}
    </section>
  );
}
