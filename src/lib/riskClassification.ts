/**
 * Risk classification rules. Thresholds come from Settings, so the same rules apply on every page.
 *
 * Critical: stock runs out before replenishment arrives, OR stock lasts no more than the critical threshold.
 * Warning:  stock lasts no more than the warning threshold, OR stock is below minimum stock.
 * Safe:     none of the above.
 *
 * Risk is always shown with its text label as well as a colour (accessibility).
 */
import type { RiskLevel } from '../types/inventory';

export interface RiskThresholds {
  criticalDays: number;
  warningDays: number;
}

export interface RiskInput {
  daysOfStock: number | null;
  gapDays: number;
  currentStock: number;
  minimumStock: number;
}

export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: 'Critical',
  warning: 'Warning',
  safe: 'Safe',
};

export const RISK_LEVEL_ORDER: RiskLevel[] = ['critical', 'warning', 'safe'];

export function classifyRisk(input: RiskInput, thresholds: RiskThresholds): RiskLevel {
  if (input.gapDays > 0) return 'critical';
  if (input.daysOfStock !== null && input.daysOfStock <= thresholds.criticalDays) return 'critical';
  if (input.daysOfStock !== null && input.daysOfStock <= thresholds.warningDays) return 'warning';
  if (input.currentStock < input.minimumStock) return 'warning';
  return 'safe';
}

/** Sort key: critical first, then warning, then safe. */
export function compareRiskLevels(a: RiskLevel, b: RiskLevel): number {
  return RISK_LEVEL_ORDER.indexOf(a) - RISK_LEVEL_ORDER.indexOf(b);
}
