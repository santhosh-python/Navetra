/**
 * Validation rules for inventory records. The add/edit form and CSV import both call
 * validateInventoryRecord, so the same data is accepted or rejected in both places.
 * Nothing is marked as imported until these checks pass.
 */
import type { InventoryItemInput } from '../types/inventory';
import { isValidIsoDate } from './dates';
import {
  INVENTORY_FIELDS,
  getFieldDefinition,
  isCriticality,
  type InventoryFieldKey,
} from './inventorySchema';

export type InventoryRecordErrors = Partial<Record<InventoryFieldKey, string>>;

export interface RecordValidationContext {
  /** SKUs that already exist (case-insensitive comparison). */
  existingSkus: string[];
  /** SKU of the record being edited, so it does not conflict with itself. */
  ignoreSku?: string;
}

export interface RecordValidationResult {
  errors: InventoryRecordErrors;
  item: InventoryItemInput | null;
}

export function parseStrictNumber(text: string): number | null {
  const cleaned = text.trim().replace(/,/g, '');
  if (cleaned === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function parseBooleanText(text: string): boolean | null {
  const normalised = text.trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(normalised)) return true;
  if (['no', 'n', 'false', '0', ''].includes(normalised)) return false;
  return null;
}

/** Validates one record given as text values keyed by field. Returns errors per field or a clean item. */
export function validateInventoryRecord(
  raw: Record<InventoryFieldKey, string>,
  context: RecordValidationContext,
): RecordValidationResult {
  const errors: InventoryRecordErrors = {};

  for (const field of INVENTORY_FIELDS) {
    const value = (raw[field.key] ?? '').trim();
    if (field.required && value === '') {
      errors[field.key] = `${field.label} is required.`;
    }
  }

  const numbers: Partial<Record<InventoryFieldKey, number>> = {};
  for (const field of INVENTORY_FIELDS) {
    const value = (raw[field.key] ?? '').trim();
    if (value === '' || (field.type !== 'number' && field.type !== 'integer')) continue;
    const parsed = parseStrictNumber(value);
    if (parsed === null) {
      errors[field.key] = `${field.label} must be a number.`;
      continue;
    }
    if (field.type === 'integer' && !Number.isInteger(parsed)) {
      errors[field.key] = `${field.label} must be a whole number.`;
      continue;
    }
    if (parsed < 0) {
      errors[field.key] = `${field.label} cannot be negative.`;
      continue;
    }
    numbers[field.key] = parsed;
  }

  for (const field of INVENTORY_FIELDS) {
    const value = (raw[field.key] ?? '').trim();
    if (value === '' || field.type !== 'date') continue;
    if (!isValidIsoDate(value)) {
      errors[field.key] = `${field.label} must be a real date in YYYY-MM-DD format.`;
    }
  }

  const criticalityText = (raw.criticality ?? '').trim().toLowerCase();
  if (criticalityText !== '' && !isCriticality(criticalityText)) {
    errors.criticality = 'Criticality must be critical, high, medium or low.';
  }

  const alternativeText = (raw.alternativeSupplierAvailable ?? '').trim();
  const alternative = parseBooleanText(alternativeText);
  if (alternativeText !== '' && alternative === null) {
    errors.alternativeSupplierAvailable = 'Use yes or no.';
  }

  const skuText = (raw.sku ?? '').trim();
  if (skuText !== '') {
    const normalisedSku = skuText.toLowerCase();
    const isDuplicate = context.existingSkus
      .filter((sku) => sku.toLowerCase() !== (context.ignoreSku ?? '').toLowerCase())
      .some((sku) => sku.toLowerCase() === normalisedSku);
    if (isDuplicate) errors.sku = 'This SKU already exists.';
  }

  const incomingQuantity = numbers.incomingQuantity ?? 0;
  const deliveryText = (raw.expectedDeliveryDate ?? '').trim();
  if (incomingQuantity > 0 && deliveryText === '') {
    errors.expectedDeliveryDate = 'Enter the expected delivery date for the incoming quantity.';
  }

  const hasErrors = Object.keys(errors).length > 0;
  if (hasErrors) return { errors, item: null };

  const item: InventoryItemInput = {
    sku: skuText,
    name: raw.name.trim(),
    category: raw.category.trim(),
    location: raw.location.trim(),
    unit: raw.unit.trim(),
    currentStock: numbers.currentStock ?? 0,
    averageDailyUsage: numbers.averageDailyUsage ?? 0,
    minimumStock: numbers.minimumStock ?? 0,
    safetyStock: numbers.safetyStock ?? 0,
    supplierName: raw.supplierName.trim(),
    leadTimeDays: numbers.leadTimeDays ?? 0,
    expectedDeliveryDate: deliveryText === '' ? null : deliveryText,
    incomingQuantity,
    unitCost: numbers.unitCost ?? 0,
    criticality: criticalityText as InventoryItemInput['criticality'],
    servicesAffected: numbers.servicesAffected ?? 0,
    alternativeSupplierAvailable: alternative ?? false,
    stockHeldElsewhere: numbers.stockHeldElsewhere ?? 0,
    lastCountDate: raw.lastCountDate.trim(),
  };
  return { errors: {}, item };
}

export interface ImportRowResult {
  /** Line number in the file (header = line 1). */
  lineNumber: number;
  status: 'valid' | 'invalid';
  /** Errors as readable messages, one per problem in the row. */
  messages: string[];
  /** Field errors, used to highlight the cell. */
  fieldErrors: InventoryRecordErrors;
  item: InventoryItemInput | null;
  /** Raw text values, shown in the preview. */
  values: Record<InventoryFieldKey, string>;
}

export interface ImportReport {
  rows: ImportRowResult[];
  validCount: number;
  invalidCount: number;
  /** Required fields with no column mapped in the file. */
  unmappedRequiredFields: InventoryFieldKey[];
}

/** Maps each inventory field to the file column it reads from (or '' when not mapped). */
export type ColumnMapping = Record<InventoryFieldKey, string>;

export function createColumnMapping(headers: string[]): ColumnMapping {
  const normalisedHeaders = headers.map((header) => header.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const mapping = {} as ColumnMapping;
  for (const field of INVENTORY_FIELDS) {
    const target = field.csvHeader.replace(/[^a-z0-9]/g, '');
    const labelTarget = field.label.toLowerCase().replace(/[^a-z0-9]/g, '');
    const matchIndex = normalisedHeaders.findIndex((header) => header === target || header === labelTarget || header === field.key.toLowerCase());
    mapping[field.key] = matchIndex >= 0 ? headers[matchIndex] : '';
  }
  return mapping;
}

/** Validates every data row. Also flags SKUs repeated within the file. */
export function validateImportRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  context: RecordValidationContext,
  firstDataLineNumber = 2,
): ImportReport {
  const unmappedRequiredFields = INVENTORY_FIELDS.filter((field) => field.required && !mapping[field.key]).map((field) => field.key);
  const headerIndex = (header: string) => headers.indexOf(header);
  const seenSkus = new Map<string, number>();

  const rowResults: ImportRowResult[] = rows.map((row, rowIndex) => {
    const lineNumber = firstDataLineNumber + rowIndex;
    const values = {} as Record<InventoryFieldKey, string>;
    for (const field of INVENTORY_FIELDS) {
      const column = mapping[field.key];
      const index = column ? headerIndex(column) : -1;
      values[field.key] = index >= 0 ? (row[index] ?? '') : '';
    }

    const { errors, item } = validateInventoryRecord(values, context);
    const messages = Object.values(errors).filter((message): message is string => Boolean(message));

    const sku = values.sku.trim().toLowerCase();
    if (sku !== '') {
      const firstLine = seenSkus.get(sku);
      if (firstLine !== undefined) {
        messages.push(`SKU repeated in this file (first seen on line ${firstLine}).`);
        errors.sku = errors.sku ?? 'Repeated SKU in this file.';
      } else {
        seenSkus.set(sku, lineNumber);
      }
    }

    const isValid = messages.length === 0 && item !== null;
    return {
      lineNumber,
      status: isValid ? 'valid' : 'invalid',
      messages,
      fieldErrors: errors,
      item: isValid ? item : null,
      values,
    };
  });

  return {
    rows: rowResults,
    validCount: rowResults.filter((row) => row.status === 'valid').length,
    invalidCount: rowResults.filter((row) => row.status === 'invalid').length,
    unmappedRequiredFields,
  };
}

export function describeFieldRule(key: InventoryFieldKey): string {
  const field = getFieldDefinition(key);
  return field.help;
}
