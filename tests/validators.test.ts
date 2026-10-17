import { describe, expect, it } from 'vitest';
import { parseBooleanText, parseStrictNumber, validateInventoryRecord } from '../src/lib/validators';
import type { InventoryFieldKey } from '../src/lib/inventorySchema';

const VALID: Record<InventoryFieldKey, string> = {
  sku: 'TST-100',
  name: 'Test item',
  category: 'Essential medicines',
  location: 'Central Store',
  unit: 'boxes',
  currentStock: '40',
  averageDailyUsage: '2',
  minimumStock: '10',
  safetyStock: '4',
  supplierName: 'Test Supplier',
  leadTimeDays: '5',
  expectedDeliveryDate: '',
  incomingQuantity: '0',
  unitCost: '120',
  criticality: 'high',
  servicesAffected: '3',
  alternativeSupplierAvailable: 'no',
  stockHeldElsewhere: '0',
  lastCountDate: '2026-10-10',
};

const withChanges = (changes: Partial<Record<InventoryFieldKey, string>>) => ({ ...VALID, ...changes });
const NO_CONFLICT = { existingSkus: ['DEMO-1'] };

describe('number and boolean parsing', () => {
  it('accepts plain and thousands-separated numbers', () => {
    expect(parseStrictNumber('42')).toBe(42);
    expect(parseStrictNumber(' 1,200.5 ')).toBe(1200.5);
    expect(parseStrictNumber('-3')).toBe(-3);
  });

  it('rejects empty text, scientific notation and trailing text', () => {
    expect(parseStrictNumber('')).toBeNull();
    expect(parseStrictNumber('1e3')).toBeNull();
    expect(parseStrictNumber('12abc')).toBeNull();
    expect(parseStrictNumber('₹40')).toBeNull();
  });

  it('reads yes/no style answers and rejects anything else', () => {
    expect(parseBooleanText('Yes')).toBe(true);
    expect(parseBooleanText('n')).toBe(false);
    expect(parseBooleanText('')).toBe(false);
    expect(parseBooleanText('maybe')).toBeNull();
  });
});

describe('validateInventoryRecord', () => {
  it('returns a clean item with parsed numbers for a valid record', () => {
    const { errors, item } = validateInventoryRecord(VALID, NO_CONFLICT);
    expect(errors).toEqual({});
    expect(item).toMatchObject({
      sku: 'TST-100',
      currentStock: 40,
      averageDailyUsage: 2,
      leadTimeDays: 5,
      unitCost: 120,
      criticality: 'high',
      alternativeSupplierAvailable: false,
      expectedDeliveryDate: null,
      incomingQuantity: 0,
    });
  });

  it('reports every missing required field by key', () => {
    const { errors, item } = validateInventoryRecord(withChanges({ sku: '  ', supplierName: '' }), NO_CONFLICT);
    expect(item).toBeNull();
    expect(errors.sku).toMatch(/required/);
    expect(errors.supplierName).toMatch(/required/);
  });

  it('rejects non-numeric, negative and fractional values for whole-number fields', () => {
    expect(validateInventoryRecord(withChanges({ currentStock: '1e3' }), NO_CONFLICT).errors.currentStock).toMatch(/must be a number/);
    expect(validateInventoryRecord(withChanges({ minimumStock: '-1' }), NO_CONFLICT).errors.minimumStock).toMatch(/cannot be negative/);
    expect(validateInventoryRecord(withChanges({ leadTimeDays: '4.5' }), NO_CONFLICT).errors.leadTimeDays).toMatch(/whole number/);
  });

  it('rejects dates that are not real calendar dates', () => {
    expect(validateInventoryRecord(withChanges({ lastCountDate: '2026-02-30' }), NO_CONFLICT).errors.lastCountDate).toMatch(/real date/);
    expect(validateInventoryRecord(withChanges({ lastCountDate: '10/10/2026' }), NO_CONFLICT).errors.lastCountDate).toMatch(/YYYY-MM-DD/);
  });

  it('only accepts the four criticality levels', () => {
    expect(validateInventoryRecord(withChanges({ criticality: 'urgent' }), NO_CONFLICT).errors.criticality).toBeDefined();
    expect(validateInventoryRecord(withChanges({ criticality: 'Critical' }), NO_CONFLICT).errors.criticality).toBeUndefined();
  });

  it('requires a delivery date when incoming quantity is above zero', () => {
    const missing = validateInventoryRecord(withChanges({ incomingQuantity: '10' }), NO_CONFLICT);
    expect(missing.errors.expectedDeliveryDate).toMatch(/expected delivery date/i);
    const provided = validateInventoryRecord(withChanges({ incomingQuantity: '10', expectedDeliveryDate: '2026-10-20' }), NO_CONFLICT);
    expect(provided.errors).toEqual({});
    expect(provided.item?.expectedDeliveryDate).toBe('2026-10-20');
  });

  it('rejects an SKU that already exists, ignoring case', () => {
    const { errors } = validateInventoryRecord(withChanges({ sku: 'demo-1' }), NO_CONFLICT);
    expect(errors.sku).toBe('This SKU already exists.');
  });

  it('lets an edited record keep its own SKU', () => {
    const { errors } = validateInventoryRecord(withChanges({ sku: 'demo-1' }), { existingSkus: ['DEMO-1'], ignoreSku: 'DEMO-1' });
    expect(errors.sku).toBeUndefined();
  });

  it('accepts only yes or no for the alternative supplier flag', () => {
    expect(validateInventoryRecord(withChanges({ alternativeSupplierAvailable: 'maybe' }), NO_CONFLICT).errors.alternativeSupplierAvailable).toBe('Use yes or no.');
    const yes = validateInventoryRecord(withChanges({ alternativeSupplierAvailable: 'Yes' }), NO_CONFLICT);
    expect(yes.item?.alternativeSupplierAvailable).toBe(true);
  });
});
