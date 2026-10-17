/**
 * Rule-based stock projection.
 *
 * Method: starting from current stock, subtract the average daily usage each day and add any
 * scheduled arrivals on their date. This is an estimate using a constant consumption rate, not a
 * machine-learning prediction. Every projected point is flagged `isEstimate: true`.
 */
import type { DailyObservation, InventoryItem } from '../types/inventory';
import type { ForecastSnapshot, ProjectionPoint, ShortageSummary } from '../types/forecast';
import { addDays, diffDays } from './dates';
import { analyseInventoryItem } from './stockAnalysis';
import type { RiskThresholds } from './riskClassification';

export interface ArrivalEvent {
  /** Days from the as-of date (0 = today). */
  dayIndex: number;
  quantity: number;
}

export interface ProjectionInput {
  asOfDate: string;
  startingStock: number;
  dailyUsage: number;
  horizonDays: number;
  arrivals: ArrivalEvent[];
}

/**
 * Day-by-day projection. Day k covers the date asOfDate + k.
 * Opening stock for day k = closing stock of day k-1 (day 0 opens with startingStock).
 * Demand is met from available stock (opening + arrivals). Any shortfall is `unmetDemand`.
 */
export function projectStockDepletion(input: ProjectionInput): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let openingStock = Math.max(0, input.startingStock);
  const usage = Math.max(0, input.dailyUsage);

  for (let dayIndex = 0; dayIndex < input.horizonDays; dayIndex += 1) {
    const arrivalsToday = input.arrivals
      .filter((arrival) => arrival.dayIndex === dayIndex)
      .reduce((sum, arrival) => sum + arrival.quantity, 0);
    const available = openingStock + arrivalsToday;
    const unmetDemand = Math.max(0, usage - available);
    const closingStock = Math.max(0, available - usage);

    points.push({
      date: addDays(input.asOfDate, dayIndex),
      dayIndex,
      projectedStock: round(closingStock),
      expectedConsumption: round(usage),
      unmetDemand: round(unmetDemand),
      arrivals: round(arrivalsToday),
      isEstimate: true,
    });
    openingStock = closingStock;
  }
  return points;
}

export interface ProjectionSummary {
  /** Day index of the first unmet demand, or null when stock never runs short within the horizon. */
  firstShortageDayIndex: number | null;
  /** Units unmet before the replenishment day. */
  shortageBeforeReplenishment: number;
  /** Stock on hand at the start of the replenishment day, after prior consumption. 0 when short. */
  stockAtReplenishment: number;
}

export function summariseProjection(
  projection: ProjectionPoint[],
  replenishmentDayIndex: number,
  openingStock: number,
): ProjectionSummary {
  const firstShortage = projection.find((point) => point.unmetDemand > 0);
  const shortageBeforeReplenishment = projection
    .filter((point) => point.dayIndex < replenishmentDayIndex)
    .reduce((sum, point) => sum + point.unmetDemand, 0);
  const dayBeforeReplenishment = projection.find((point) => point.dayIndex === replenishmentDayIndex - 1);
  const stockAtReplenishment =
    shortageBeforeReplenishment > 0
      ? 0
      : replenishmentDayIndex <= 0
        ? openingStock
        : (dayBeforeReplenishment?.projectedStock ?? openingStock);

  return {
    firstShortageDayIndex: firstShortage ? firstShortage.dayIndex : null,
    shortageBeforeReplenishment: Math.max(0, Math.ceil(shortageBeforeReplenishment - 1e-9)),
    stockAtReplenishment: Math.max(0, round(stockAtReplenishment)),
  };
}

/**
 * Builds the complete forecast for one item: the projection for the horizon plus the same
 * summary figures used on the Overview and Recommendations pages.
 */
export function buildForecastSnapshot(
  item: InventoryItem,
  asOfDate: string,
  thresholds: RiskThresholds,
  horizonDays: number,
  targetCoverDays: number,
): ForecastSnapshot {
  const analysis = analyseInventoryItem(item, asOfDate, thresholds, { targetCoverDays });
  const replenishmentDayIndex = diffDays(asOfDate, analysis.replenishmentDate);
  const arrivals: ArrivalEvent[] = item.expectedDeliveryDate
    ? [{ dayIndex: replenishmentDayIndex, quantity: item.incomingQuantity }]
    : [];

  const projection = projectStockDepletion({
    asOfDate,
    startingStock: item.currentStock,
    dailyUsage: item.averageDailyUsage,
    horizonDays,
    arrivals,
  });

  const summary: ShortageSummary = {
    daysOfStock: analysis.daysOfStock,
    stockOutDate: analysis.stockOutDate,
    replenishmentDate: analysis.replenishmentDate,
    gapDays: analysis.gapDays,
    shortageQuantity: analysis.shortageQuantity,
    risk: analysis.risk,
  };

  return {
    itemId: item.id,
    asOfDate,
    method: 'rule-based',
    projection,
    summary,
    demandDuringLeadTime: analysis.demandDuringLeadTime,
  };
}

/**
 * Observed stock levels (end of day) for the chart history. Values come from the demo history
 * and are labelled as observed, never as estimates.
 */
export function observedClosingStockSeries(history: DailyObservation[]): { date: string; closingStock: number }[] {
  return history.map((day) => ({
    date: day.date,
    closingStock: round(day.openingStock - day.consumption + day.received),
  }));
}

/** Number of items whose stock would last no more than `warningDays` on a given day. */
export function countItemsAtRiskOnDay(openingStockByItem: { openingStock: number; dailyUsage: number }[], warningDays: number): number {
  return openingStockByItem.filter((entry) => {
    if (entry.dailyUsage <= 0) return false;
    return entry.openingStock / entry.dailyUsage <= warningDays;
  }).length;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
