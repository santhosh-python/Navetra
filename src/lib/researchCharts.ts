import type { ResearchHistoryItem, ResearchProduct, ResearchSummary, ResearchForecast } from '../services/researchService';

export interface ResearchBarDatum {
  label: string;
  value: number;
}

export interface ResearchHistoryPoint {
  date: string;
  consumption: number;
  stock: number;
  stockout: number;
}

export interface ResearchForecastPoint {
  date: string;
  observedStock: number | null;
  projectedStock: number | null;
  consumption: number | null;
}

export interface ResearchDemandForecastPoint {
  date: string;
  observedConsumption: number | null;
  predictedConsumption: number | null;
}

export interface ResearchScenarioPoint {
  period: string;
  baselineStock: number;
  simulatedStock: number;
}

function isValidDate(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

export function buildQuarterBars(quarters: ResearchSummary['quarters']): ResearchBarDatum[] {
  return Object.entries(quarters)
    .filter(([, value]) => Number.isFinite(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

export function buildHistoricalProductBars(products: Pick<ResearchProduct, 'name1' | 'stockout_rate_percent'>[]): ResearchBarDatum[] {
  return products
    .filter((product) => Number.isFinite(product.stockout_rate_percent))
    .map((product) => ({ label: product.name1, value: product.stockout_rate_percent }));
}

export function buildResearchHistorySeries(items: Array<Pick<ResearchHistoryItem, 'date' | 'consumption' | 'closeBalance' | 'stockout'>>): ResearchHistoryPoint[] {
  return items
    .filter((item) => isValidDate(item.date) && [item.consumption, item.closeBalance, item.stockout].every(Number.isFinite))
    .map((item) => ({
      date: item.date,
      consumption: item.consumption,
      stock: item.closeBalance,
      stockout: item.stockout,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function buildResearchForecastSeries(
  history: Pick<ResearchHistoryItem, 'date' | 'consumption' | 'closeBalance'>[],
  projection: Pick<ResearchForecast['projection'][number], 'date' | 'expected_consumption' | 'projected_closing_stock'>[],
): ResearchForecastPoint[] {
  const points = new Map<string, ResearchForecastPoint>();
  for (const item of history) {
    if (isValidDate(item.date) && [item.consumption, item.closeBalance].every(Number.isFinite)) {
      points.set(item.date, {
        date: item.date,
        observedStock: item.closeBalance,
        projectedStock: null,
        consumption: item.consumption,
      });
    }
  }
  for (const item of projection) {
    if (isValidDate(item.date) && [item.expected_consumption, item.projected_closing_stock].every(Number.isFinite)) {
      points.set(item.date, {
        date: item.date,
        observedStock: null,
        projectedStock: item.projected_closing_stock,
        consumption: item.expected_consumption,
      });
    }
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildResearchDemandForecastSeries(
  history: Pick<ResearchHistoryItem, 'date' | 'consumption'>[],
  projection: Pick<ResearchForecast['projection'][number], 'date' | 'expected_consumption'>[],
): ResearchDemandForecastPoint[] {
  const points = new Map<string, ResearchDemandForecastPoint>();
  for (const item of history) {
    if (isValidDate(item.date) && Number.isFinite(item.consumption)) {
      points.set(item.date, { date: item.date, observedConsumption: item.consumption, predictedConsumption: null });
    }
  }
  for (const item of projection) {
    if (isValidDate(item.date) && Number.isFinite(item.expected_consumption)) {
      points.set(item.date, { date: item.date, observedConsumption: null, predictedConsumption: item.expected_consumption });
    }
  }
  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildResearchScenarioSeries(
  startingStock: number,
  baselineConsumption: number,
  simulatedConsumption: number,
  periods = 6,
): ResearchScenarioPoint[] {
  return Array.from({ length: Math.max(1, periods) + 1 }, (_, index) => ({
    period: `Period ${index}`,
    baselineStock: Math.max(0, startingStock - baselineConsumption * index),
    simulatedStock: Math.max(0, startingStock - simulatedConsumption * index),
  }));
}
