/**
 * Single definition of the inventory fields. The add/edit form, CSV template, column mapping and
 * validation all read from this list, so a new field only needs to be added here.
 */
import type { InventoryItemInput, ItemCriticality } from '../types/inventory';
import { ITEM_CRITICALITIES } from '../types/inventory';

export type InventoryFieldKey =
  | 'sku'
  | 'name'
  | 'category'
  | 'location'
  | 'unit'
  | 'currentStock'
  | 'averageDailyUsage'
  | 'minimumStock'
  | 'safetyStock'
  | 'supplierName'
  | 'leadTimeDays'
  | 'expectedDeliveryDate'
  | 'incomingQuantity'
  | 'unitCost'
  | 'criticality'
  | 'servicesAffected'
  | 'alternativeSupplierAvailable'
  | 'stockHeldElsewhere'
  | 'lastCountDate';

export type InventoryFieldType = 'text' | 'number' | 'integer' | 'date' | 'boolean' | 'criticality';

export interface InventoryFieldDefinition {
  key: InventoryFieldKey;
  /** Human label shown in forms, mapping and errors. */
  label: string;
  /** Column name expected in CSV files. */
  csvHeader: string;
  type: InventoryFieldType;
  required: boolean;
  /** Units for numeric fields (display only). */
  unitHint?: string;
  help: string;
}

export const INVENTORY_FIELDS: InventoryFieldDefinition[] = [
  { key: 'sku', label: 'SKU', csvHeader: 'sku', type: 'text', required: true, help: 'Unique code for the item.' },
  { key: 'name', label: 'Item name', csvHeader: 'name', type: 'text', required: true, help: 'Name shown across the app.' },
  { key: 'category', label: 'Category', csvHeader: 'category', type: 'text', required: true, help: 'Supply category, e.g. Essential medicines.' },
  { key: 'location', label: 'Location', csvHeader: 'location', type: 'text', required: true, help: 'Where the stock is kept.' },
  { key: 'unit', label: 'Unit of measure', csvHeader: 'unit', type: 'text', required: true, help: 'e.g. sachets, boxes, litres. All quantities use this unit.' },
  { key: 'currentStock', label: 'Current stock', csvHeader: 'current_stock', type: 'number', required: true, unitHint: 'units', help: 'Usable stock on hand.' },
  { key: 'averageDailyUsage', label: 'Average daily usage', csvHeader: 'average_daily_usage', type: 'number', required: true, unitHint: 'units/day', help: 'Average consumption per day. Zero means no consumption recorded.' },
  { key: 'minimumStock', label: 'Minimum stock', csvHeader: 'minimum_stock', type: 'number', required: true, unitHint: 'units', help: 'Level below which the item is flagged.' },
  { key: 'safetyStock', label: 'Safety stock', csvHeader: 'safety_stock', type: 'number', required: false, unitHint: 'units', help: 'Buffer kept above lead-time demand. Optional, defaults to 0.' },
  { key: 'supplierName', label: 'Supplier', csvHeader: 'supplier_name', type: 'text', required: true, help: 'Main supplier for this item.' },
  { key: 'leadTimeDays', label: 'Supplier lead time', csvHeader: 'lead_time_days', type: 'integer', required: true, unitHint: 'days', help: 'Days from order to delivery.' },
  { key: 'expectedDeliveryDate', label: 'Expected delivery date', csvHeader: 'expected_delivery_date', type: 'date', required: false, help: 'Next scheduled delivery (YYYY-MM-DD). Leave blank when nothing is scheduled.' },
  { key: 'incomingQuantity', label: 'Incoming quantity', csvHeader: 'incoming_quantity', type: 'number', required: false, unitHint: 'units', help: 'Quantity arriving on the expected delivery date. Optional, defaults to 0.' },
  { key: 'unitCost', label: 'Unit cost (₹)', csvHeader: 'unit_cost', type: 'number', required: true, unitHint: '₹ per unit', help: 'Price per unit in rupees.' },
  { key: 'criticality', label: 'Criticality', csvHeader: 'criticality', type: 'criticality', required: true, help: 'critical, high, medium or low.' },
  { key: 'servicesAffected', label: 'Services affected', csvHeader: 'services_affected', type: 'integer', required: false, unitHint: 'people/services', help: 'Patients, wards or services that depend on this item. Optional, defaults to 0.' },
  { key: 'alternativeSupplierAvailable', label: 'Alternative supplier available', csvHeader: 'alternative_supplier_available', type: 'boolean', required: false, help: 'yes or no. Optional, defaults to no.' },
  { key: 'stockHeldElsewhere', label: 'Stock held at other locations', csvHeader: 'stock_held_elsewhere', type: 'number', required: false, unitHint: 'units', help: 'Units available at other locations. Optional, defaults to 0.' },
  { key: 'lastCountDate', label: 'Last stock count', csvHeader: 'last_count_date', type: 'date', required: true, help: 'Date of the last physical count (YYYY-MM-DD).' },
];

export const REQUIRED_CSV_HEADERS = INVENTORY_FIELDS.filter((field) => field.required).map((field) => field.csvHeader);

export function getFieldDefinition(key: InventoryFieldKey): InventoryFieldDefinition {
  const field = INVENTORY_FIELDS.find((definition) => definition.key === key);
  if (!field) throw new Error(`Unknown inventory field: ${key}`);
  return field;
}

/** Lower-case, letters and digits only. Used to match CSV headers loosely (e.g. "Current Stock" = "current_stock"). */
export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function isCriticality(value: string): value is ItemCriticality {
  return (ITEM_CRITICALITIES as readonly string[]).includes(value);
}

export const EMPTY_INVENTORY_FORM: Record<InventoryFieldKey, string> = {
  sku: '',
  name: '',
  category: '',
  location: '',
  unit: '',
  currentStock: '',
  averageDailyUsage: '',
  minimumStock: '',
  safetyStock: '',
  supplierName: '',
  leadTimeDays: '',
  expectedDeliveryDate: '',
  incomingQuantity: '',
  unitCost: '',
  criticality: 'medium',
  servicesAffected: '',
  alternativeSupplierAvailable: 'no',
  stockHeldElsewhere: '',
  lastCountDate: '',
};

export type InventoryDraft = InventoryItemInput;
