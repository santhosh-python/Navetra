import type { ItemCriticality, RiskLevel } from './inventory';

/** The action wording used across the app. Never claims an action has happened. */
export type RecommendedAction =
  | 'Reorder now'
  | 'Confirm supplier dispatch'
  | 'Transfer stock from another location'
  | 'Investigate unusually high consumption'
  | 'Check stock records'
  | 'Increase safety stock'
  | 'Monitor the next delivery';

/** One labelled factor of the transparent priority score. Points are fixed in lib/priorityScoring.ts. */
export interface PriorityFactor {
  id: 'timeUntilShortage' | 'supplierLeadTime' | 'criticality' | 'servicesAffected' | 'noAlternativeSupplier';
  label: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

export interface Recommendation {
  itemId: string;
  sku: string;
  itemName: string;
  criticality: ItemCriticality;
  risk: RiskLevel;
  /** Points out of 100 from the disclosed rule set. */
  priorityScore: number;
  priorityFactors: PriorityFactor[];
  daysUntilStockOut: number | null;
  stockOutDate: string | null;
  replenishmentDate: string;
  gapDays: number;
  action: RecommendedAction;
  /** Plain-language reason, generated from the item's values. */
  reason: string;
  /** Suggested order quantity in the item's unit (0 when no order is needed). */
  suggestedReorderQuantity: number;
  suggestedReorderValue: number;
}

/** User-side status for a recommendation (kept in frontend state for this session). */
export interface RecommendationStatus {
  reviewed: boolean;
  /** ISO date until which the recommendation is hidden, or null. */
  snoozedUntil: string | null;
}

export interface RecordedAction {
  id: string;
  itemId: string;
  recordedAt: string;
  actionTaken: string;
  note: string;
}
