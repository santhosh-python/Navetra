import { CircleCheck, OctagonAlert, TriangleAlert, Info } from 'lucide-react';
import type { ItemCriticality, RiskLevel } from '../../types/inventory';
import { RISK_LABELS } from '../../lib/riskClassification';
import { CRITICALITY_LABELS } from '../../lib/priorityScoring';

/** Risk is always shown with an icon and a text label, never colour alone. */
export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const icon =
    risk === 'critical' ? <OctagonAlert size={13} aria-hidden="true" /> : risk === 'warning' ? <TriangleAlert size={13} aria-hidden="true" /> : <CircleCheck size={13} aria-hidden="true" />;
  return (
    <span className={`badge badge--${risk}`}>
      {icon}
      {RISK_LABELS[risk]}
    </span>
  );
}

export type BadgeTone = 'critical' | 'warning' | 'safe' | 'info' | 'neutral';

export function Badge({ tone = 'neutral', children, showIcon = false }: { tone?: BadgeTone; children: React.ReactNode; showIcon?: boolean }) {
  return (
    <span className={`badge badge--${tone}`}>
      {showIcon && <Info size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function CriticalityBadge({ criticality }: { criticality: ItemCriticality }) {
  const tone: BadgeTone = criticality === 'critical' ? 'critical' : criticality === 'high' ? 'warning' : 'neutral';
  return <Badge tone={tone}>{CRITICALITY_LABELS[criticality]}</Badge>;
}
