import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  context?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'critical';
  tooltip?: string;
  /** Change versus the previous week. `goodWhen` says which direction is good, so colour matches meaning. */
  trend?: { text: string; direction: 'up' | 'down' | 'flat'; goodWhen: 'up' | 'down' };
}

export function MetricCard({ label, value, context, icon, tone = 'default', tooltip, trend }: MetricCardProps) {
  const trendIsBad = trend && trend.direction !== 'flat' && trend.direction !== trend.goodWhen;
  const trendIsGood = trend && trend.direction !== 'flat' && trend.direction === trend.goodWhen;
  const TrendIcon = trend?.direction === 'up' ? ArrowUpRight : trend?.direction === 'down' ? ArrowDownRight : Minus;
  return (
    <article className={`card metric ${tone === 'critical' ? 'metric--critical' : ''}`}>
      <div className="metric__header">
        <span className="metric__label">
          {label}
          {tooltip && <InfoTooltip text={tooltip} label={`About ${label}`} />}
        </span>
        {icon && <span className="metric__icon">{icon}</span>}
      </div>
      <div className="metric__value">{value}</div>
      {trend && (
        <span className={`metric__trend ${trendIsBad ? 'metric__trend--up-bad' : ''} ${trendIsGood ? 'metric__trend--down-good' : ''}`}>
          <TrendIcon size={14} aria-hidden="true" />
          {trend.text}
        </span>
      )}
      {context && <div className="metric__context">{context}</div>}
    </article>
  );
}
