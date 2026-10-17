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

const configuredBase =
  (import.meta.env.VITE_RESEARCH_API_BASE_URL as string | undefined) ?? "";

function getResearchApiBase(): string {
  return (
    configuredBase.trim().replace(/\/+$/, "") ||
    "http://127.0.0.1:8000"
  );
}

async function getJson<T>(path: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getResearchApiBase()}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(
      "Cannot connect to the research API. Check that the Python backend is running on port 8000."
    );
  }

  if (!response.ok) {
    throw new Error(`Research API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

export function getResearchSummary(): Promise<ResearchSummary> {
  return getJson<ResearchSummary>("/research/summary");
}

export function getResearchProducts(limit = 10): Promise<{
  total: number;
  limit: number;
  offset: number;
  items: ResearchProduct[];
}> {
  return getJson(`/research/products?limit=${limit}`);
}
