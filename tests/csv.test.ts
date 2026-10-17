import { describe, expect, it } from 'vitest';
import { parseCsvText, stringifyCsv } from '../src/lib/csv';
import { createColumnMapping, validateImportRows } from '../src/lib/validators';
import { REQUIRED_CSV_HEADERS } from '../src/lib/inventorySchema';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';

const HEADER = [
  'sku', 'name', 'category', 'location', 'unit', 'current_stock', 'average_daily_usage', 'minimum_stock',
  'safety_stock', 'supplier_name', 'lead_time_days', 'expected_delivery_date', 'incoming_quantity', 'unit_cost',
  'criticality', 'services_affected', 'alternative_supplier_available', 'stock_held_elsewhere', 'last_count_date',
];
const goodRow = 'TST-001,"Gloves, nitrile",Medical consumables,Central Store,boxes,36,3,20,10,Telangana Surgical Supplies,4,,0,420,high,180,yes,25,2026-10-01';

describe('CSV parsing', () => {
  it('handles quoted commas, escaped quotes and CRLF line endings', () => {
    const parsed = parseCsvText('a,b\r\n"x, y","say ""hi"""\r\n');
    expect(parsed.headers).toEqual(['a', 'b']);
    expect(parsed.rows).toEqual([['x, y', 'say "hi"']]);
  });

  it('strips a UTF-8 byte order mark', () => {
    expect(parseCsvText('\uFEFFsku,name\nA,B').headers).toEqual(['sku', 'name']);
  });

  it('reports rows with the wrong number of cells', () => {
    const parsed = parseCsvText('a,b,c\n1,2\n1,2,3');
    expect(parsed.malformedLineNumbers).toEqual([2]);
  });

  it('round-trips through stringify', () => {
    const text = stringifyCsv(['name', 'note'], [['Gloves, nitrile', 'line "one"']]);
    expect(parseCsvText(text).rows).toEqual([['Gloves, nitrile', 'line "one"']]);
  });
});

describe('import validation', () => {
  const mappingFor = (headers: string[]) => createColumnMapping(headers);

  it('accepts a valid row and maps it to an inventory item', () => {
    const parsed = parseCsvText(`${HEADER.join(',')}\n${goodRow}`);
    const report = validateImportRows(parsed.headers, parsed.rows, mappingFor(parsed.headers), { existingSkus: [] });
    expect(report.validCount).toBe(1);
    expect(report.rows[0].item?.alternativeSupplierAvailable).toBe(true);
    expect(report.rows[0].item?.expectedDeliveryDate).toBeNull();
  });

  it('reports missing required columns', () => {
    const headers = ['sku', 'name'];
    const report = validateImportRows(headers, [['A', 'B']], mappingFor(headers), { existingSkus: [] });
    expect(report.unmappedRequiredFields).toContain('currentStock');
    expect(REQUIRED_CSV_HEADERS).toContain('current_stock');
  });

  it('flags invalid numbers, negative quantities and invalid dates with row-level errors', () => {
    const bad = goodRow.replace(',36,', ',abc,').replace(',2026-10-01', ',2026-13-01');
    const negative = goodRow.replace('TST-001', 'TST-002').replace(',36,', ',-4,');
    const parsed = parseCsvText(`${HEADER.join(',')}\n${bad}\n${negative}`);
    const report = validateImportRows(parsed.headers, parsed.rows, mappingFor(parsed.headers), { existingSkus: [] });
    expect(report.invalidCount).toBe(2);
    expect(report.rows[0].fieldErrors.currentStock).toMatch(/number/);
    expect(report.rows[0].fieldErrors.lastCountDate).toMatch(/real date/);
    expect(report.rows[1].fieldErrors.currentStock).toMatch(/negative/);
  });

  it('flags missing values and repeated SKUs within the file', () => {
    const missing = goodRow.replace('Central Store', '');
    const parsed = parseCsvText(`${HEADER.join(',')}\n${goodRow}\n${goodRow}\n${missing.replace('TST-001', 'TST-003')}`);
    const report = validateImportRows(parsed.headers, parsed.rows, mappingFor(parsed.headers), { existingSkus: [] });
    expect(report.rows[1].messages.join(' ')).toMatch(/repeated/i);
    expect(report.rows[2].fieldErrors.location).toMatch(/required/);
    expect(report.validCount).toBe(1);
  });

  it('flags SKUs that already exist in inventory', () => {
    const parsed = parseCsvText(`${HEADER.join(',')}\n${goodRow}`);
    const report = validateImportRows(parsed.headers, parsed.rows, mappingFor(parsed.headers), { existingSkus: ['TST-001'] });
    expect(report.rows[0].fieldErrors.sku).toMatch(/already exists/);
  });

  it('requires a delivery date when incoming stock is entered', () => {
    const row = goodRow.replace(',0,420', ',50,420');
    const parsed = parseCsvText(`${HEADER.join(',')}\n${row}`);
    const report = validateImportRows(parsed.headers, parsed.rows, mappingFor(parsed.headers), { existingSkus: [] });
    expect(report.rows[0].fieldErrors.expectedDeliveryDate).toMatch(/delivery date/);
  });

  it('matches headers loosely (case, spaces and underscores ignored)', () => {
    const headers = ['SKU', 'Current Stock', 'Item Name'];
    const mapping = createColumnMapping(headers);
    expect(mapping.sku).toBe('SKU');
    expect(mapping.currentStock).toBe('Current Stock');
    expect(mapping.name).toBe('Item Name');
  });

  it('uses the demo as-of date as reference (dates are not compared to the future here)', () => {
    expect(DEMO_AS_OF_DATE).toBe('2026-10-17');
  });
});
