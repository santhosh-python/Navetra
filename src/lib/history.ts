/** Helpers for recorded (observed) stock history. Pure functions over DailyObservation arrays. */
import type { DailyObservation } from '../types/inventory';
import { calculateAverage, calculateCoefficientOfVariationPercent } from './calculations';

export const RECENT_WINDOW_DAYS = 7;

/**
 * Average consumption over the most recent 7 days divided by the average over the whole history.
 * Above 1 means recent use is higher than normal. Null when there is no recorded use.
 */
export function calculateRecentUsageRatio(history: DailyObservation[]): number | null {
  const overall = calculateAverage(history.map((day) => day.consumption));
  const recent = calculateAverage(history.slice(-RECENT_WINDOW_DAYS).map((day) => day.consumption));
  if (overall === null || recent === null || overall <= 0) return null;
  return recent / overall;
}

/** Demand variability over the history, as a percentage (coefficient of variation). */
export function calculateDemandVariabilityPercent(history: DailyObservation[]): number | null {
  return calculateCoefficientOfVariationPercent(history.map((day) => day.consumption));
}

/** Observed days on which the item recorded no consumption and stock was at zero. Used for data checks. */
export function countRecordedStockOutDays(history: DailyObservation[]): number {
  return history.filter((day) => day.openingStock <= 0).length;
}
