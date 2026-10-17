/**
 * Converts inventory items to CSV rows using the import schema's column names, so an export
 * can be edited and imported again without renaming columns.
 */
import type { InventoryItem } from '../types/inventory';
import { INVENTORY_FIELDS } from './inventorySchema';

export function buildInventoryCsv(items: InventoryItem[]): { headers: string[]; rows: (string | number | boolean)[][] } {
  const headers = INVENTORY_FIELDS.map((field) => field.csvHeader);
  const rows = items.map((item) => [
    item.sku,
    item.name,
    item.category,
    item.location,
    item.unit,
    item.currentStock,
    item.averageDailyUsage,
    item.minimumStock,
    item.safetyStock,
    item.supplierName,
    item.leadTimeDays,
    item.expectedDeliveryDate ?? '',
    item.incomingQuantity,
    item.unitCost,
    item.criticality,
    item.servicesAffected,
    item.alternativeSupplierAvailable ? 'yes' : 'no',
    item.stockHeldElsewhere,
    item.lastCountDate,
  ]);
  return { headers, rows };
}
