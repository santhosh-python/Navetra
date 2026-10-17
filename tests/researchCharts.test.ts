import { describe, expect, it } from 'vitest';
import {
  buildHistoricalProductBars,
  buildQuarterBars,
  buildResearchDemandForecastSeries,
  buildResearchHistorySeries,
  buildResearchScenarioSeries,
  buildResearchForecastSeries,
} from '../src/lib/researchCharts';

describe('research chart transformations', () => {
  it('keeps quarter counts from the summary response in chronological order', () => {
    expect(buildQuarterBars({ '2023 Q2': 4, '2019 Q4': 2, '2023 Q1': 3 })).toEqual([
      { label: '2019 Q4', value: 2 },
      { label: '2023 Q1', value: 3 },
      { label: '2023 Q2', value: 4 },
    ]);
  });

  it('uses source stockout rates for product bars and excludes invalid values', () => {
    expect(buildHistoricalProductBars([
      { name1: 'Alpha', stockout_rate_percent: 12.5 },
      { name1: 'Beta', stockout_rate_percent: Number.NaN },
    ])).toEqual([{ label: 'Alpha', value: 12.5 }]);
  });

  it('maps observed history without replacing source stockout labels', () => {
    expect(buildResearchHistorySeries([
      { date: '2023-01-01', consumption: 4, closeBalance: 8, stockout: 1 } as const,
      { date: '2023-02-01', consumption: 2, closeBalance: 6, stockout: 0 } as const,
    ])).toEqual([
      { date: '2023-01-01', consumption: 4, stock: 8, stockout: 1 },
      { date: '2023-02-01', consumption: 2, stock: 6, stockout: 0 },
    ]);
  });

  it('keeps forecasts separate from observed history', () => {
    expect(buildResearchForecastSeries(
      [{ date: '2023-02-01', consumption: 2, closeBalance: 6 }],
      [{ date: '2023-03-01', expected_consumption: 3, projected_closing_stock: 3 }],
    )).toEqual([
      { date: '2023-02-01', observedStock: 6, projectedStock: null, consumption: 2 },
      { date: '2023-03-01', observedStock: null, projectedStock: 3, consumption: 3 },
    ]);
  });

  it('excludes forecast points with invalid numeric values', () => {
    expect(buildResearchForecastSeries(
      [{ date: '2023-02-01', consumption: 2, closeBalance: 6 }],
      [
        { date: '2023-03-01', expected_consumption: Number.NaN, projected_closing_stock: 3 },
        { date: '2023-04-01', expected_consumption: 3, projected_closing_stock: 1 },
      ],
    )).toEqual([
      { date: '2023-02-01', observedStock: 6, projectedStock: null, consumption: 2 },
      { date: '2023-04-01', observedStock: null, projectedStock: 1, consumption: 3 },
    ]);
  });

  it('separates observed and predicted consumption at the forecast boundary', () => {
    expect(buildResearchDemandForecastSeries(
      [{ date: '2023-11-01', consumption: 12 }],
      [{ date: '2023-12-01', expected_consumption: 10 }],
    )).toEqual([
      { date: '2023-11-01', observedConsumption: 12, predictedConsumption: null },
      { date: '2023-12-01', observedConsumption: null, predictedConsumption: 10 },
    ]);
  });

  it('excludes invalid dates from chart series', () => {
    expect(buildResearchHistorySeries([
      { date: 'not-a-date', consumption: 1, closeBalance: 2, stockout: 0 },
      { date: '2023-01-01', consumption: 3, closeBalance: 4, stockout: 0 },
    ])).toEqual([{ date: '2023-01-01', consumption: 3, stock: 4, stockout: 0 }]);
  });

  it('derives baseline and simulated scenario lines from supplied inputs', () => {
    expect(buildResearchScenarioSeries(100, 10, 15, 2)).toEqual([
      { period: 'Period 0', baselineStock: 100, simulatedStock: 100 },
      { period: 'Period 1', baselineStock: 90, simulatedStock: 85 },
      { period: 'Period 2', baselineStock: 80, simulatedStock: 70 },
    ]);
  });
});
