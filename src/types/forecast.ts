import type { RiskLevel } from './inventory';

/** One projected day of stock. `isEstimate` is always true for projections. */
export interface ProjectionPoint {
  date: string;
  /** Days from the as-of date (0 = today). */
  dayIndex: number;
  /** Stock at the end of the day, never below zero. */
  projectedStock: number;
  /** Units expected to be consumed on this day. */
  expectedConsumption: number;
  /** Units that could not be supplied on this day. */
  unmetDemand: number;
  /** Units received on this day (replenishment or simulated arrival). */
  arrivals: number;
  isEstimate: true;
}

/** Summary of one stock scenario (baseline or simulated). */
export interface ShortageSummary {
  /** Days the current stock lasts (current stock ÷ daily usage). null when usage is zero. */
  daysOfStock: number | null;
  /** Date the first unmet demand occurs, or null when the horizon has no stock-out. */
  stockOutDate: string | null;
  /** Date stock is replenished (scheduled delivery, or one lead time from today). */
  replenishmentDate: string;
  /** Days between stock-out and replenishment. 0 when stock lasts until replenishment. */
  gapDays: number;
  /** Units short before replenishment. 0 when there is no shortage. */
  shortageQuantity: number;
  risk: RiskLevel;
}

export interface ForecastSnapshot {
  itemId: string;
  asOfDate: string;
  /** Method label shown to the user, e.g. "Rule-based estimate". */
  method: 'rule-based';
  projection: ProjectionPoint[];
  summary: ShortageSummary;
  /** Units expected during the supplier lead time (daily usage × lead time days). */
  demandDuringLeadTime: number;
}
