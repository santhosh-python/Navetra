import type { DateOnly } from "./inventory";

export type RecommendationReason =
  | "below-minimum-stock"
  | "lead-time-risk"
  | "forecast-shortage"
  | "manual-review";

export interface ReplenishmentRecommendation {
  id: string;
  inventoryItemId: string;
  recommendedQuantity: number;
  unit: string;
  estimatedCost: number;
  orderByDate: DateOnly | null;
  reason: RecommendationReason;
  status: "proposed" | "accepted" | "dismissed";
}
