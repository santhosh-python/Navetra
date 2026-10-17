import type { ForecastResponse } from "../types/forecast";
import { requestJson } from "./apiClient";

/** Calls the real configured API route; there is intentionally no fake forecast fallback. */
export function getForecasts(): Promise<ForecastResponse> {
  return requestJson<ForecastResponse>("/forecasts");
}
