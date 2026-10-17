interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-label={title}>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
