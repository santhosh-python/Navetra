/**
 * Stock calculations. Every function is pure: the same inputs always give the same outputs.
 * Units: quantities are in the item's unit; durations are in calendar days.
 * The as-of date is passed in explicitly, so nothing here reads the system clock.
 */
import { addDays, diffDays } from './dates';

/** Default number of days of demand the reorder policy aims to cover beyond lead time. */
export const DEFAULT_TARGET_COVER_DAYS = 30;

/** Demand to cover one shortfall window: daily usage × supplier lead time. */
export function calculateDemandDuringLeadTime(dailyUsage: number, leadTimeDays: number): number {
  return roundToTwoDecimals(Math.max(0, dailyUsage) * Math.max(0, leadTimeDays));
}

/**
 * Days the current stock lasts at the average daily usage (currentStock ÷ dailyUsage).
 * Returns null when there is no recorded usage, because stock then never runs out on the current rate.
 */
export function calculateDaysOfStock(currentStock: number, dailyUsage: number): number | null {
  if (dailyUsage <= 0) return null;
  return Math.max(0, currentStock) / dailyUsage;
}

/**
 * The date stock is projected to run out: the as-of date plus whole days of stock.
 * Returns null when there is no usage.
 */
export function calculateStockOutDate(asOfDate: string, daysOfStock: number | null): string | null {
  if (daysOfStock === null) return null;
  return addDays(asOfDate, Math.floor(daysOfStock));
}

/**
 * The date new stock is expected: the scheduled delivery when one exists,
 * otherwise the earliest possible new order (one supplier lead time from the as-of date).
 */
export function calculateReplenishmentDate(
  asOfDate: string,
  expectedDeliveryDate: string | null,
  leadTimeDays: number,
): string {
  return expectedDeliveryDate ?? addDays(asOfDate, leadTimeDays);
}

/** Days from as-of date to replenishment (never negative). */
export function calculateDaysUntilReplenishment(asOfDate: string, replenishmentDate: string): number {
  return Math.max(0, diffDays(asOfDate, replenishmentDate));
}

/**
 * Days between projected stock-out and replenishment. Zero when stock lasts until replenishment
 * or when there is no stock-out.
 */
export function calculateShortageGapDays(stockOutDate: string | null, replenishmentDate: string): number {
  if (stockOutDate === null) return 0;
  return Math.max(0, diffDays(stockOutDate, replenishmentDate));
}

/**
 * Units short before replenishment: demand during the wait minus stock on hand.
 * Assumes consumption continues at the average rate.
 */
export function calculateShortageQuantity(
  currentStock: number,
  dailyUsage: number,
  daysUntilReplenishment: number,
): number {
  const demandUntilReplenishment = Math.max(0, dailyUsage) * Math.max(0, daysUntilReplenishment);
  return Math.max(0, Math.ceil(demandUntilReplenishment - Math.max(0, currentStock) - 1e-9));
}

/** Stock plus inbound stock: what the organisation will have if nothing else changes. */
export function calculateInventoryPosition(currentStock: number, incomingQuantity: number): number {
  return currentStock + incomingQuantity;
}

/**
 * Reorder point: the inventory position at which a new order should be placed.
 * Reorder point = daily usage × lead time + safety stock.
 */
export function calculateReorderPoint(dailyUsage: number, leadTimeDays: number, safetyStock: number): number {
  return calculateDemandDuringLeadTime(dailyUsage, leadTimeDays) + Math.max(0, safetyStock);
}

/**
 * Policy order quantity. Zero while the inventory position is at or above the reorder point.
 * Otherwise it refills to (lead time + target cover days) of demand plus safety stock.
 */
export function calculatePolicyReorderQuantity(input: {
  dailyUsage: number;
  leadTimeDays: number;
  safetyStock: number;
  currentStock: number;
  incomingQuantity: number;
  targetCoverDays: number;
}): number {
  const position = calculateInventoryPosition(input.currentStock, input.incomingQuantity);
  const reorderPoint = calculateReorderPoint(input.dailyUsage, input.leadTimeDays, input.safetyStock);
  if (position >= reorderPoint) return 0;
  const orderUpToLevel =
    Math.max(0, input.dailyUsage) * (Math.max(0, input.leadTimeDays) + Math.max(0, input.targetCoverDays)) +
    Math.max(0, input.safetyStock);
  return Math.max(0, Math.ceil(orderUpToLevel - position - 1e-9));
}

/**
 * Emergency quantity to bridge a timing gap: the shortage before replenishment
 * plus the safety-stock target. Zero when there is no shortage.
 */
export function calculateEmergencyOrderQuantity(shortageQuantity: number, safetyStockTarget: number): number {
  if (shortageQuantity <= 0) return 0;
  return Math.max(0, Math.ceil(shortageQuantity + Math.max(0, safetyStockTarget) - 1e-9));
}

/** Suggested order quantity: the larger of the policy quantity and the emergency quantity. */
export function calculateSuggestedOrderQuantity(policyQuantity: number, emergencyQuantity: number): number {
  return Math.max(policyQuantity, emergencyQuantity);
}

/** Money value of an order. Result is in INR (₹). */
export function calculateOrderValue(quantity: number, unitCost: number): number {
  return roundToTwoDecimals(Math.max(0, quantity) * Math.max(0, unitCost));
}

/**
 * Inventory turnover = annual usage ÷ average stock. This project approximates average stock by
 * current stock, so the result is an indicative figure. Returns null when it cannot be calculated.
 */
export function calculateInventoryTurnover(dailyUsage: number, currentStock: number): number | null {
  if (dailyUsage <= 0 || currentStock <= 0) return null;
  return roundToTwoDecimals((dailyUsage * 365) / currentStock);
}

export function calculateAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Coefficient of variation (standard deviation ÷ mean), as a percentage. */
export function calculateCoefficientOfVariationPercent(values: number[]): number | null {
  const mean = calculateAverage(values);
  if (mean === null || mean <= 0) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return roundToTwoDecimals((Math.sqrt(variance) / mean) * 100);
}

/** Percentage change from `previous` to `current`. Null when the previous value is zero. */
export function calculatePercentChange(previous: number, current: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
