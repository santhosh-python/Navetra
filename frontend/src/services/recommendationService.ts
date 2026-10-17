import type { ReplenishmentRecommendation } from "../types/recommendations";
import { requestJson } from "./apiClient";

/** Calls the configured API; recommendation data is never fabricated locally. */
export function getRecommendations(): Promise<ReplenishmentRecommendation[]> {
  return requestJson<ReplenishmentRecommendation[]>("/recommendations");
}
