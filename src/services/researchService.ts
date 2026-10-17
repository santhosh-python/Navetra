export interface ResearchSummary {
  dataset: string;
  data_context: string;
  rows: number;
  facilities: number;
  products: number;
  first_observation: string;
  last_observation: string;
  unique_observation_dates: number;
  stockout_rows: number;
  stockout_rate_percent: number;
  balance_checks: number;
  balance_mismatches: number;
  quarters: Record<string, number>;
}

export interface ResearchProduct {
  productID: string;
  name1: string;
  observations: number;
  facility_count: number;
  mean_recorded_consumption: number | null;
  stockout_rate_percent: number;
  last_observed: string;
}

export interface ResearchFacility {
  hf_pk: string;
  facility_type: string;
  district: string;
  observations: number;
  product_count: number;
  last_observed: string;
}

export interface ResearchHistoryItem {
  hf_pk: string;
  productID: string;
  name1: string;
  date: string;
  quarter: string;
  stockout: number;
  openBalance: number;
  received: number;
  consumption: number;
  closeBalance: number;
}

export interface ResearchHistory {
  facility_id: string;
  product_id: string;
  product_name: string;
  records_returned: number;
  items: ResearchHistoryItem[];
}

export interface ResearchForecastProjection {
  date: string;
  expected_consumption: number;
  projected_closing_stock: number;
  unmet_demand: number;
  stockout_risk: boolean;
}

export interface ResearchForecast {
  facility_id: string;
  product_id: string;
  product_name: string;
  method: string;
  data_context: string;
  last_observed_date: string;
  historical_observations: number;
  observations_used_for_baseline: number;
  starting_stock: number;
  average_monthly_consumption: number;
  first_projected_stockout_risk: string | null;
  future_receipts_assumed: number;
  projection: ResearchForecastProjection[];
  limitations: string[];
}

export interface ResearchMlForecast {
  facility_id: string;
  product_id: string;
  product_name: string;
  prediction_for_month: string;
  last_observed_date: string;
  stockout_probability: number;
  stockout_risk: boolean;
  decision_threshold: number;
  model_version: string;
  data_context: string;
  limitations: string[];
}

export interface ResearchMetrics {
  n: number;
  stockout_prevalence_percent: number;
  accuracy_percent: number;
  precision_percent: number;
  recall_percent: number;
  f1_percent: number;
  confusion_matrix: number[][];
  threshold?: number;
  average_precision_percent?: number | null;
  roc_auc_percent?: number | null;
}

export interface ResearchBacktest {
  test_from: string;
  test_to: string;
  evaluation_months: string[];
  evaluations: number;
  eligible_facility_product_series: number;
  actual_stockouts: number;
  actual_stockout_rate_percent: number;
  target_definition: string;
  stock_based_rule: ResearchMetrics;
  previous_month_persistence_baseline: ResearchMetrics;
  methodology: string;
}

export interface ResearchHealth {
  status: string;
  dataset_file_exists: boolean;
  model_artifact_exists: boolean;
  model_loadable: boolean;
  ready: boolean;
  model_error: string | null;
  model_version: string | null;
  decision_threshold: number | null;
}

const configuredBase =
  (import.meta.env.VITE_RESEARCH_API_BASE_URL as string | undefined) ?? "";
const REQUEST_TIMEOUT_MS = 10_000;

function getResearchApiBase(): string {
  return configuredBase.trim().replace(/\/+$/, "");
}

async function getJson<T>(path: string): Promise<T> {
  const base = getResearchApiBase();
  if (!base) {
    throw new Error(
      "The historical research API is not configured. Set VITE_RESEARCH_API_BASE_URL."
    );
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  );
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Research API request failed with status ${response.status}.`);
    }
    const body: unknown = await response.json();
    if (body === null || typeof body !== "object") {
      throw new Error("Research API returned an invalid response.");
    }
    return body as T;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw new Error("The research API request timed out.");
    }
    if (cause instanceof Error) throw cause;
    throw new Error("Unable to read the research API response.");
  } finally {
    window.clearTimeout(timeout);
  }
}

export function getResearchHealth(): Promise<ResearchHealth> {
  return getJson<ResearchHealth>("/health");
}

export function getResearchSummary(): Promise<ResearchSummary> {
  return getJson<ResearchSummary>("/research/summary");
}

export function getResearchBacktest(): Promise<ResearchBacktest> {
  return getJson<ResearchBacktest>(
    "/research/backtest?test_from=2023-01-01&test_to=2023-11-01"
  );
}

export function getResearchFacilities(limit = 100, offset = 0): Promise<{
  total: number;
  limit: number;
  offset: number;
  items: ResearchFacility[];
}> {
  return getJson(
    `/research/facilities?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`
  );
}

export function getResearchHistory(
  facilityId: string,
  productId: string,
  limit = 50,
): Promise<ResearchHistory> {
  const params = new URLSearchParams({
    facility_id: facilityId,
    product_id: productId,
    limit: String(limit),
  });
  return getJson(`/research/history?${params.toString()}`);
}

export function getResearchMlForecast(
  facilityId: string,
  productId: string,
): Promise<ResearchMlForecast> {
  const params = new URLSearchParams({
    facility_id: facilityId,
    product_id: productId,
  });
  return getJson(`/research/ml-forecast?${params.toString()}`);
}

export function getResearchForecast(
  facilityId: string,
  productId: string,
  horizonMonths = 3,
): Promise<ResearchForecast> {
  const params = new URLSearchParams({
    facility_id: facilityId,
    product_id: productId,
    horizon_months: String(horizonMonths),
  });
  return getJson(`/research/forecast?${params.toString()}`);
}

export function getResearchProducts(limit = 10): Promise<{
  total: number;
  limit: number;
  offset: number;
  items: ResearchProduct[];
}> {
  return getJson(`/research/products?limit=${encodeURIComponent(limit)}`);
}
