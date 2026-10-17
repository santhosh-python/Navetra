import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_DELIVERY_HISTORY } from '../src/data/demoDeliveries';
import { buildDemoStockHistoryByItem } from '../src/data/demoHistory';
import { DEMO_AS_OF_DATE, addDays } from '../src/lib/dates';
import { buildAtRiskTrend, buildInventoryRows, countByRisk, findAnalysisForItem, summariseRisk, trendDayOffset } from '../src/lib/portfolio';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, THRESHOLDS, 30);
const history = buildDemoStockHistoryByItem(DEMO_ITEMS, DEMO_DELIVERY_HISTORY, DEMO_AS_OF_DATE);

describe('portfolio risk summary', () => {
  it('classifies every item into exactly one risk level', () => {
    const counts = countByRisk(rows);
    expect(counts.critical + counts.warning + counts.safe).toBe(DEMO_ITEMS.length);
  });

  it('matches the expected demo split of 5 critical, 8 warning and 5 safe', () => {
    expect(countByRisk(rows)).toEqual({ critical: 5, warning: 8, safe: 5 });
  });

  it('summary agrees with the per-level counts and totals', () => {
    const summary = summariseRisk(rows);
    const counts = countByRisk(rows);
    expect(summary.total).toBe(DEMO_ITEMS.length);
    expect({ critical: summary.critical, warning: summary.warning, safe: summary.safe }).toEqual(counts);
    const expectedAtRisk = rows.filter(({ analysis }) => analysis.gapDays > 0).length;
    expect(summary.atRiskBeforeReplenishment).toBe(expectedAtRisk);
    expect(summary.suggestedReorderValue).toBeGreaterThanOrEqual(0);
  });

  it('finds an analysis by item id and returns undefined for an unknown id', () => {
    expect(findAnalysisForItem(rows, DEMO_ITEMS[0].id)?.risk).toBe(rows[0].analysis.risk);
    expect(findAnalysisForItem(rows, 'NOT-A-REAL-ID')).toBeUndefined();
  });
});

describe('at-risk trend', () => {
  const points = buildAtRiskTrend(DEMO_ITEMS, history, DEMO_AS_OF_DATE, 30, 30, THRESHOLDS.warningDays, 30, THRESHOLDS);

  it('covers 30 observed days followed by the forecast horizon', () => {
    expect(points).toHaveLength(60);
    expect(points.slice(0, 30).every((point) => !point.isEstimate)).toBe(true);
    expect(points.slice(30).every((point) => point.isEstimate)).toBe(true);
  });

  it('places today at index 30 and dates the points consecutively', () => {
    expect(points[30].date).toBe(DEMO_AS_OF_DATE);
    expect(trendDayOffset(DEMO_AS_OF_DATE, points[23].date)).toBe(-7);
    for (let index = 1; index < points.length; index += 1) {
      expect(points[index].date).toBe(addDays(points[index - 1].date, 1));
    }
  });

  it('counts are whole numbers within the size of the inventory', () => {
    for (const point of points) {
      expect(Number.isInteger(point.count)).toBe(true);
      expect(point.count).toBeGreaterThanOrEqual(0);
      expect(point.count).toBeLessThanOrEqual(DEMO_ITEMS.length);
    }
  });
});
