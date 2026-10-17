/**
 * Session status for recommendations: reviewed flags and snooze dates.
 * Snoozing hides a recommendation until the snooze date passes. It never changes stock figures.
 */
import type { RecommendationStatus } from '../types/recommendations';

export const NO_RECOMMENDATION_STATUS: RecommendationStatus = { reviewed: false, snoozedUntil: null };

/** True while the snooze date is still in the future relative to the as-of date. */
export function isSnoozed(status: RecommendationStatus, asOfDate: string): boolean {
  return status.snoozedUntil !== null && status.snoozedUntil > asOfDate;
}

/** Items shown in the active queue: not snoozed. Reviewed items stay visible, marked as reviewed. */
export function isInActiveQueue(status: RecommendationStatus, asOfDate: string): boolean {
  return !isSnoozed(status, asOfDate);
}
