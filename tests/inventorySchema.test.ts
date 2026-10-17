import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { INVENTORY_FIELDS, REQUIRED_CSV_HEADERS, normaliseHeader } from '../src/lib/inventorySchema';
import { createColumnMapping, validateImportRows } from '../src/lib/validators';
import { buildInventoryCsv } from '../src/lib/inventoryExport';
import { parseCsvText, stringifyCsv } from '../src/lib/csv';

describe('inventory schema', () => {
  it('lists the 13 required CSV headers in the documented order', () => {
    expect(REQUIRED_CSV_HEADERS).toEqual([
      'sku', 'name', 'category', 'location', 'unit', 'current_stock', 'average_daily_usage', 'minimum_stock',
      'supplier_name', 'lead_time_days', 'unit_cost', 'criticality', 'last_count_date',
    ]);
  });

  it('gives every field a unique key and CSV header', () => {
    expect(new Set(INVENTORY_FIELDS.map((field) => field.key)).size).toBe(INVENTORY_FIELDS.length);
    expect(new Set(INVENTORY_FIELDS.map((field) => field.csvHeader)).size).toBe(INVENTORY_FIELDS.length);
  });

  it('normalises headers so case, spaces and underscores do not matter', () => {
    expect(normaliseHeader('Current Stock')).toBe('currentstock');
    expect(normaliseHeader('current_stock')).toBe('currentstock');
  });

  it('maps loosely written headers to the right fields', () => {
    const mapping = createColumnMapping(['SKU', 'Current Stock', 'average_daily_usage', 'Unknown column']);
    expect(mapping.sku).toBe('SKU');
    expect(mapping.currentStock).toBe('Current Stock');
    expect(mapping.averageDailyUsage).toBe('average_daily_usage');
    expect(mapping.name).toBe('');
  });

  it('round-trips the demo inventory through export, CSV text and import without losing a row', () => {
    const exported = buildInventoryCsv(DEMO_ITEMS);
    const text = stringifyCsv(exported.headers, exported.rows);
    const parsed = parseCsvText(text);
    const report = validateImportRows(
      parsed.headers,
      parsed.rows,
      createColumnMapping(parsed.headers),
      { existingSkus: [] },
    );
    expect(report.unmappedRequiredFields).toEqual([]);
    expect(report.invalidCount).toBe(0);
    expect(report.validCount).toBe(DEMO_ITEMS.length);
    const importedSkus = report.rows.map((row) => row.item?.sku);
    expect(importedSkus).toEqual(DEMO_ITEMS.map((item) => item.sku));
    expect(report.rows[0].item?.currentStock).toBe(DEMO_ITEMS[0].currentStock);
    expect(DEMO_AS_OF_DATE).toBe('2026-10-17');
  });

  it('flags a file missing a required column', () => {
    const report = validateImportRows(['sku', 'name'], [['A-1', 'Thing']], createColumnMapping(['sku', 'name']), { existingSkus: [] });
    expect(report.unmappedRequiredFields).toContain('currentStock');
    expect(report.unmappedRequiredFields).not.toContain('sku');
  });
});
