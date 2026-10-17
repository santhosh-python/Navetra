import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: "neutral" | "critical" | "warning" | "safe";
  context?: ReactNode;
  tooltip?: string;
}

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  context,
  tooltip,
}: MetricCardProps) {
  return (
    <article className={`metric-card${tone === "critical" ? " metric-card--critical" : ""}`} aria-label={`${label}: ${value}`} title={tooltip}>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        <span className={`metric-card__icon metric-card__icon--${tone}`}><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__description">{description}</p>
      {context ? <div className="metric-card__context">{context}</div> : null}
    </article>
  );
}
