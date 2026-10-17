import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_DELIVERY_HISTORY } from '../src/data/demoDeliveries';
import { buildDemoStockHistoryByItem } from '../src/data/demoHistory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { buildInventoryRows, countByRisk } from '../src/lib/portfolio';
import { buildRankedRecommendations } from '../src/lib/recommendations';
import { REPORT_TYPES, buildReport, reportToCsvRows, type ReportInput, type ReportType } from '../src/lib/reports';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const history = buildDemoStockHistoryByItem(DEMO_ITEMS, DEMO_DELIVERY_HISTORY, DEMO_AS_OF_DATE);
const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, THRESHOLDS, 30);
const recommendations = buildRankedRecommendations(DEMO_ITEMS, {
  asOfDate: DEMO_AS_OF_DATE,
  thresholds: THRESHOLDS,
  targetCoverDays: 30,
  recentUsageRatioByItemId: {},
});

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  rows,
  recommendations,
  historyByItemId: history,
  asOfDate: DEMO_AS_OF_DATE,
  horizonDays: 30,
  replenishmentWindowDays: 14,
  ...overrides,
});

describe('report builders', () => {
  it('defines six report types with unique ids', () => {
    expect(REPORT_TYPES).toHaveLength(6);
    expect(new Set(REPORT_TYPES.map((report) => report.id)).size).toBe(6);
  });

  it('builds every report with consistent column and row shapes', () => {
    for (const report of REPORT_TYPES) {
      const table = buildReport(report.id as ReportType, input());
      expect(table.columns.length).toBeGreaterThan(0);
      for (const row of table.rows) {
        for (const column of table.columns) {
          expect(row[column.key], `${report.id}.${column.key}`).toBeDefined();
        }
      }
    }
  });

  it('inventory status lists every item once', () => {
    expect(buildReport('inventory-status', input()).rows).toHaveLength(DEMO_ITEMS.length);
  });

  it('critical shortage report contains exactly the critical items', () => {
    expect(buildReport('critical-shortages', input()).rows).toHaveLength(countByRisk(rows).critical);
  });

  it('upcoming replenishment grows (never shrinks) as the window widens', () => {
    const short = buildReport('upcoming-replenishment', input({ replenishmentWindowDays: 7 })).rows.length;
    const long = buildReport('upcoming-replenishment', input({ replenishmentWindowDays: 30 })).rows.length;
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it('CSV rows keep raw numbers, not formatted display strings', () => {
    const table = buildReport('inventory-status', input());
    const csv = reportToCsvRows(table);
    expect(csv.headers).toHaveLength(table.columns.length);
    expect(csv.rows).toHaveLength(table.rows.length);
    const numericColumn = table.columns.findIndex((column) => column.align === 'right');
    expect(numericColumn).toBeGreaterThanOrEqual(0);
    const firstRaw = csv.rows[0][numericColumn];
    expect(typeof firstRaw).toBe('number');
    expect(table.rows[0][table.columns[numericColumn].key].display).toBeDefined();
  });
});
