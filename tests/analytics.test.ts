import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_DELIVERY_HISTORY } from '../src/data/demoDeliveries';
import { DEMO_STOCK_OUT_INCIDENTS, buildDemoStockHistoryByItem } from '../src/data/demoHistory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { buildInventoryRows } from '../src/lib/portfolio';
import {
  CRITICALITY_SCORE,
  SCATTER_DAYS_CAP,
  averageIncidentDuration,
  buildCategoryRiskRows,
  buildConsumptionSeries,
  buildCriticalityScatter,
  buildStockOutHistoryRows,
  buildTurnoverRows,
  buildVariabilityRows,
  countDeliveriesByStatus,
} from '../src/lib/analytics';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, THRESHOLDS, 30);
const history = buildDemoStockHistoryByItem(DEMO_ITEMS, DEMO_DELIVERY_HISTORY, DEMO_AS_OF_DATE);

describe('analytics builders', () => {
  it('category risk counts add up to every item', () => {
    const categories = buildCategoryRiskRows(rows);
    const total = categories.reduce((sum, entry) => sum + entry.critical + entry.warning + entry.safe, 0);
    expect(total).toBe(DEMO_ITEMS.length);
    for (const entry of categories) {
      const expected = DEMO_ITEMS.filter((item) => item.category === entry.category).length;
      expect(entry.critical + entry.warning + entry.safe).toBe(expected);
    }
  });

  it('keeps criticality scores in the 1-4 scale and caps scatter days', () => {
    expect(CRITICALITY_SCORE).toEqual({ low: 1, medium: 2, high: 3, critical: 4 });
    const points = buildCriticalityScatter(rows);
    expect(points).toHaveLength(DEMO_ITEMS.length);
    for (const point of points) {
      expect(point.criticalityScore).toBeGreaterThanOrEqual(1);
      expect(point.criticalityScore).toBeLessThanOrEqual(4);
      expect(point.daysOfStock).toBeLessThanOrEqual(SCATTER_DAYS_CAP);
      expect(point.jitter).toBeGreaterThanOrEqual(-0.5);
      expect(point.jitter).toBeLessThanOrEqual(0.5);
    }
  });

  it('jitter is deterministic so the chart does not move between renders', () => {
    expect(buildCriticalityScatter(rows).map((point) => point.jitter)).toEqual(buildCriticalityScatter(rows).map((point) => point.jitter));
  });

  it('leaves turnover blank when there is no use or no stock', () => {
    const [first] = rows;
    const noUse = { ...first, item: { ...first.item, averageDailyUsage: 0 } };
    const noStock = { ...first, item: { ...first.item, currentStock: 0 } };
    const result = buildTurnoverRows([noUse, noStock, first]);
    expect(result[0].turnover).toBeNull();
    expect(result[1].turnover).toBeNull();
    expect(result[2].turnover).toBe(Math.round(((first.item.averageDailyUsage * 365) / first.item.currentStock) * 100) / 100);
  });

  it('sorts variability from most to least variable', () => {
    const result = buildVariabilityRows(DEMO_ITEMS, history);
    expect(result).toHaveLength(DEMO_ITEMS.length);
    for (let index = 1; index < result.length; index += 1) {
      expect(result[index - 1].variabilityPercent ?? -1).toBeGreaterThanOrEqual(result[index].variabilityPercent ?? -1);
    }
  });

  it('sums consumption across chosen items by date, in date order', () => {
    const [a, b] = DEMO_ITEMS;
    const series = buildConsumptionSeries([a.id, b.id], history);
    const dates = series.map((point) => point.date);
    expect(dates).toEqual([...dates].sort());
    const firstDate = history[a.id][0].date;
    const expected = (history[a.id][0].consumption + history[b.id][0].consumption);
    expect(series.find((point) => point.date === firstDate)?.consumption).toBeCloseTo(expected, 1);
    expect(buildConsumptionSeries([], history)).toEqual([]);
  });

  it('lists stock-out incidents newest first and names items that were removed', () => {
    const incidents = buildStockOutHistoryRows(
      [
        ...DEMO_STOCK_OUT_INCIDENTS,
        { ...DEMO_STOCK_OUT_INCIDENTS[0], id: 'INC-GONE', itemId: 'NOT-IN-LIST', startDate: '2026-10-16' },
      ],
      DEMO_ITEMS,
    );
    expect(incidents[0].incidentId).toBe('INC-GONE');
    expect(incidents[0].itemName).toBe('Item no longer in inventory');
    const starts = incidents.map((incident) => incident.startDate);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('averages incident durations and returns null for none', () => {
    expect(averageIncidentDuration([])).toBeNull();
    const durations = DEMO_STOCK_OUT_INCIDENTS.map((incident) => incident.durationDays);
    const expected = durations.reduce((sum, value) => sum + value, 0) / durations.length;
    expect(averageIncidentDuration(DEMO_STOCK_OUT_INCIDENTS)).toBeCloseTo(expected, 5);
  });

  it('counts scheduled and received deliveries separately', () => {
    const counts = countDeliveriesByStatus(DEMO_DELIVERY_HISTORY);
    expect(counts.received + counts.scheduled).toBe(DEMO_DELIVERY_HISTORY.filter((d) => d.status === 'received' || d.status === 'scheduled').length);
  });
});
