/**
 * Transparent priority score (0–100).
 *
 * This is a fixed, rule-based points system, NOT a statistical model or a confidence score.
 * Each factor has a published maximum so the ranking can be explained to the user.
 * Changing a point value here changes every recommendation ranking; the UI displays these rules.
 */
import type { InventoryItem, ItemCriticality } from '../types/inventory';
import type { PriorityFactor } from '../types/recommendations';
import type { ItemAnalysis } from './stockAnalysis';
import type { RiskThresholds } from './riskClassification';

export const PRIORITY_MAX_SCORE = 100;

/** Items with stock lasting up to this many days receive a small timing score. */
export const PLANNING_HORIZON_BAND_DAYS = 30;

export const CRITICALITY_POINTS: Record<ItemCriticality, number> = {
  critical: 25,
  high: 18,
  medium: 10,
  low: 4,
};

export const CRITICALITY_LABELS: Record<ItemCriticality, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Points for time until shortage: a shortage before delivery scores highest. */
export function calculateTimeUntilShortagePoints(analysis: ItemAnalysis, thresholds: RiskThresholds): number {
  if (analysis.gapDays > 0) return 40;
  if (analysis.daysOfStock === null) return 0;
  if (analysis.daysOfStock <= thresholds.criticalDays) return 32;
  if (analysis.daysOfStock <= thresholds.warningDays) return 20;
  if (analysis.daysOfStock <= PLANNING_HORIZON_BAND_DAYS) return 8;
  return 0;
}

/** Points for supplier lead time: longer lead times leave less room to react. */
export function calculateLeadTimePoints(leadTimeDays: number): number {
  if (leadTimeDays >= 14) return 15;
  if (leadTimeDays >= 7) return 10;
  if (leadTimeDays >= 3) return 5;
  return 2;
}

/** Points for services affected: one point per 40 patients or services, capped at 10. */
export function calculateServicesPoints(servicesAffected: number): number {
  return Math.min(10, Math.round(servicesAffected / 40));
}

export function buildPriorityFactors(
  item: InventoryItem,
  analysis: ItemAnalysis,
  thresholds: RiskThresholds,
): PriorityFactor[] {
  const hasAlternative = item.alternativeSupplierAvailable || item.stockHeldElsewhere > 0;
  const timePoints = calculateTimeUntilShortagePoints(analysis, thresholds);
  const leadPoints = calculateLeadTimePoints(item.leadTimeDays);
  const criticalityPoints = CRITICALITY_POINTS[item.criticality];
  const servicePoints = calculateServicesPoints(item.servicesAffected);
  const alternativePoints = hasAlternative ? 0 : 10;

  return [
    {
      id: 'timeUntilShortage',
      label: 'Time until shortage',
      points: timePoints,
      maxPoints: 40,
      explanation:
        analysis.gapDays > 0
          ? `Stock runs out ${analysis.gapDays} day${analysis.gapDays === 1 ? '' : 's'} before replenishment.`
          : analysis.daysOfStock === null
            ? 'No consumption recorded, so no shortage timing applies.'
            : `Stock lasts about ${Math.floor(analysis.daysOfStock)} days and arrives in time.`,
    },
    {
      id: 'supplierLeadTime',
      label: 'Supplier lead time',
      points: leadPoints,
      maxPoints: 15,
      explanation: `Lead time is ${item.leadTimeDays} days. Longer lead times leave less room to react.`,
    },
    {
      id: 'criticality',
      label: 'Criticality of the item',
      points: criticalityPoints,
      maxPoints: 25,
      explanation: `Criticality is set to ${CRITICALITY_LABELS[item.criticality].toLowerCase()} in the inventory record.`,
    },
    {
      id: 'servicesAffected',
      label: 'Services affected',
      points: servicePoints,
      maxPoints: 10,
      explanation: `${item.servicesAffected.toLocaleString('en-IN')} patients or services depend on this item.`,
    },
    {
      id: 'noAlternativeSupplier',
      label: 'No alternative supply',
      points: alternativePoints,
      maxPoints: 10,
      explanation: hasAlternative
        ? 'An alternative supplier or stock at another location is recorded.'
        : 'No alternative supplier or stock at another location is recorded.',
    },
  ];
}

export function sumPriorityPoints(factors: PriorityFactor[]): number {
  return factors.reduce((sum, factor) => sum + factor.points, 0);
}

/**
 * Plain-language disclosure of the priority score. The Recommendations page prints this table,
 * so keep it in step with the functions above. Maximum points must sum to PRIORITY_MAX_SCORE.
 */
export const PRIORITY_DISCLOSURE: { factor: string; maxPoints: number; rule: string }[] = [
  {
    factor: 'Time until shortage',
    maxPoints: 40,
    rule: 'Stock runs out before replenishment: 40. Within the critical threshold: 32. Within the warning threshold: 20. Within 30 days: 8.',
  },
  {
    factor: 'Supplier lead time',
    maxPoints: 15,
    rule: '14 days or more: 15. 7 to 13 days: 10. 3 to 6 days: 5. Under 3 days: 2.',
  },
  {
    factor: 'Criticality',
    maxPoints: 25,
    rule: 'Critical: 25. High: 18. Medium: 10. Low: 4.',
  },
  {
    factor: 'Services affected',
    maxPoints: 10,
    rule: '1 point per 40 people or services affected, capped at 10.',
  },
  {
    factor: 'No alternative supplier or stock elsewhere',
    maxPoints: 10,
    rule: 'Awarded when no alternative supplier is available and no stock is held at other locations.',
  },
];
