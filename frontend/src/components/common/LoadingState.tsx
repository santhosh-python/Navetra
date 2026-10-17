interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <p className="loading-state" role="status" aria-live="polite">
      {label}
    </p>
  );
}
