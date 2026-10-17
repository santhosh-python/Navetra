/**
 * Portfolio-level aggregation: totals, risk counts and trends across all items.
 * Every page that shows totals uses these functions, so the numbers agree everywhere.
 */
import type { DailyObservation, InventoryItem, RiskLevel } from '../types/inventory';
import type { ProjectionPoint } from '../types/forecast';
import { addDays, diffDays } from './dates';
import type { InventoryRow } from './inventoryQuery';
import { analyseInventoryItem, type ItemAnalysis } from './stockAnalysis';
import type { RiskThresholds } from './riskClassification';
import { buildForecastSnapshot } from './forecasting';

export interface RiskSummary {
  total: number;
  critical: number;
  warning: number;
  safe: number;
  /** Items whose stock runs out before replenishment arrives (gap > 0). */
  atRiskBeforeReplenishment: number;
  /** Sum of suggested order values for Critical and Warning items (INR). */
  suggestedReorderValue: number;
}

export function buildInventoryRows(items: InventoryItem[], asOfDate: string, thresholds: RiskThresholds, targetCoverDays: number): InventoryRow[] {
  return items.map((item) => ({
    item,
    analysis: analyseInventoryItem(item, asOfDate, thresholds, { targetCoverDays }),
  }));
}

export function summariseRisk(rows: InventoryRow[]): RiskSummary {
  const summary: RiskSummary = {
    total: rows.length,
    critical: 0,
    warning: 0,
    safe: 0,
    atRiskBeforeReplenishment: 0,
    suggestedReorderValue: 0,
  };
  for (const { analysis } of rows) {
    summary[analysis.risk] += 1;
    if (analysis.gapDays > 0) summary.atRiskBeforeReplenishment += 1;
    if (analysis.risk !== 'safe') summary.suggestedReorderValue += analysis.suggestedOrderValue;
  }
  return summary;
}

export function countByRisk(rows: InventoryRow[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { critical: 0, warning: 0, safe: 0 };
  for (const { analysis } of rows) counts[analysis.risk] += 1;
  return counts;
}

/** Items whose stock lasts no more than `warningDays` on each day of the window (observed, then projected). */
export interface AtRiskTrendPoint {
  date: string;
  count: number;
  /** true for dates from the as-of date onward (estimates); false for observed history. */
  isEstimate: boolean;
}

export function buildAtRiskTrend(
  items: InventoryItem[],
  historyByItemId: Record<string, DailyObservation[]>,
  asOfDate: string,
  historyDays: number,
  horizonDays: number,
  warningDays: number,
  targetCoverDays: number,
  thresholds: RiskThresholds,
): AtRiskTrendPoint[] {
  const points: AtRiskTrendPoint[] = [];

  for (let offset = -historyDays; offset < 0; offset += 1) {
    const date = addDays(asOfDate, offset);
    let count = 0;
    for (const item of items) {
      const day = historyByItemId[item.id]?.find((observation) => observation.date === date);
      if (!day || item.averageDailyUsage <= 0) continue;
      if (day.openingStock / item.averageDailyUsage <= warningDays) count += 1;
    }
    points.push({ date, count, isEstimate: false });
  }

  const projections: { item: InventoryItem; projection: ProjectionPoint[] }[] = items.map((item) => ({
    item,
    projection: buildForecastSnapshot(item, asOfDate, thresholds, horizonDays, targetCoverDays).projection,
  }));

  for (let dayIndex = 0; dayIndex < horizonDays; dayIndex += 1) {
    const date = addDays(asOfDate, dayIndex);
    let count = 0;
    for (const { item, projection } of projections) {
      if (item.averageDailyUsage <= 0) continue;
      const openingStock = dayIndex === 0 ? item.currentStock : projection[dayIndex - 1].projectedStock;
      if (openingStock / item.averageDailyUsage <= warningDays) count += 1;
    }
    points.push({ date, count, isEstimate: true });
  }

  return points;
}

/** Days from the as-of date for a point in the trend (negative = history). */
export function trendDayOffset(asOfDate: string, date: string): number {
  return diffDays(asOfDate, date);
}

export function findAnalysisForItem(rows: InventoryRow[], itemId: string): ItemAnalysis | undefined {
  return rows.find((row) => row.item.id === itemId)?.analysis;
}
