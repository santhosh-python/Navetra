import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { buildInventoryRows } from '../src/lib/portfolio';
import { DEFAULT_INVENTORY_QUERY, filterInventoryRows, sortInventoryRows } from '../src/lib/inventoryQuery';

const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, { criticalDays: 7, warningDays: 14 }, 30);

describe('inventory filtering', () => {
  it('returns every row with default controls', () => {
    expect(filterInventoryRows(rows, DEFAULT_INVENTORY_QUERY)).toHaveLength(DEMO_ITEMS.length);
  });

  it('searches by name and SKU, case-insensitively', () => {
    expect(filterInventoryRows(rows, { ...DEFAULT_INVENTORY_QUERY, search: 'saline' }).map((row) => row.item.sku)).toEqual(['MED-SAL-075']);
    expect(filterInventoryRows(rows, { ...DEFAULT_INVENTORY_QUERY, search: 'lab-dtk' })).toHaveLength(1);
  });

  it('filters by risk, category and location together', () => {
    const result = filterInventoryRows(rows, {
      ...DEFAULT_INVENTORY_QUERY,
      risk: 'critical',
      category: 'Essential medicines',
      location: 'Central Store',
    });
    expect(result.map((row) => row.item.sku)).toEqual(['MED-ORS-001']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterInventoryRows(rows, { ...DEFAULT_INVENTORY_QUERY, search: 'zzz-no-match' })).toEqual([]);
  });
});

describe('inventory sorting', () => {
  it('sorts by urgency with critical items first', () => {
    const sorted = sortInventoryRows(rows, 'urgency', 'asc');
    expect(sorted[0].analysis.risk).toBe('critical');
    expect(sorted[sorted.length - 1].analysis.risk).toBe('safe');
  });

  it('sorts by stock level in both directions', () => {
    const ascending = sortInventoryRows(rows, 'stock', 'asc');
    const descending = sortInventoryRows(rows, 'stock', 'desc');
    expect(ascending[0].item.currentStock).toBeLessThanOrEqual(ascending[1].item.currentStock);
    expect(descending[0].item.currentStock).toBeGreaterThanOrEqual(descending[1].item.currentStock);
  });

  it('places items without usage last when sorting by stock-out date', () => {
    const withoutUsage = rows.map((row) => (row.item.id === 'FOOD-RIC-25' ? { ...row, analysis: { ...row.analysis, stockOutDate: null } } : row));
    const sorted = sortInventoryRows(withoutUsage, 'stockOutDate', 'asc');
    expect(sorted[sorted.length - 1].analysis.stockOutDate).toBeNull();
  });

  it('does not mutate the input array', () => {
    const copy = [...rows];
    sortInventoryRows(rows, 'name', 'desc');
    expect(rows).toEqual(copy);
  });
});
