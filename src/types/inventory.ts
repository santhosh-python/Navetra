/**
 * Core inventory data model.
 *
 * Units: every quantity is expressed in `unit` (e.g. "sachets", "boxes").
 * Daily consumption is in the same unit per day. Money is INR (₹) per unit.
 * Dates are calendar dates in ISO format `YYYY-MM-DD` (no time component).
 */

export const ITEM_CATEGORIES = [
  'Essential medicines',
  'Medical consumables',
  'Laboratory supplies',
  'Food and kitchen',
  'Cleaning and sanitation',
  'Emergency supplies',
] as const;
/**
 * Category label. The default list is ITEM_CATEGORIES; users can add their own
 * categories in Settings, so this is a string alias rather than a closed union.
 */
export type ItemCategory = string;

export const ITEM_CRITICALITIES = ['critical', 'high', 'medium', 'low'] as const;
export type ItemCriticality = (typeof ITEM_CRITICALITIES)[number];

/** Risk status produced by lib/riskClassification.ts. Always shown with a text label too. */
export type RiskLevel = 'critical' | 'warning' | 'safe';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  location: string;
  /** Unit of measure, e.g. "sachets", "boxes", "litres". */
  unit: string;
  /** Usable stock on hand, in `unit`. */
  currentStock: number;
  /** Average consumption per calendar day, in `unit`/day. */
  averageDailyUsage: number;
  /** Stock level below which the item should be flagged. In `unit`. */
  minimumStock: number;
  /** Buffer kept on top of lead-time demand, in `unit`. */
  safetyStock: number;
  supplierName: string;
  leadTimeDays: number;
  /** Next scheduled delivery date, or null when nothing is scheduled. */
  expectedDeliveryDate: string | null;
  /** Quantity arriving on `expectedDeliveryDate`, in `unit`. */
  incomingQuantity: number;
  /** Price per unit in INR (₹). */
  unitCost: number;
  criticality: ItemCriticality;
  /** Patients, wards or services that depend on this item. */
  servicesAffected: number;
  /** Whether a second supplier can supply this item at short notice. */
  alternativeSupplierAvailable: boolean;
  /** Units of this item held at other locations of the same organisation. */
  stockHeldElsewhere: number;
  /** Date of the last physical stock count (ISO date). */
  lastCountDate: string;
}

/** Input used by the add/edit form and CSV import. Numbers are already parsed. */
export type InventoryItemInput = Omit<InventoryItem, 'id'>;

/**
 * One day in the stock history (demo data, same unit as the item).
 * Stock is measured at the START of the day, before that day's consumption,
 * which matches how currentStock is defined.
 */
export interface DailyObservation {
  date: string;
  openingStock: number;
  /** Units received during the day. */
  received: number;
  /** Units consumed during the day. */
  consumption: number;
}

export interface DeliveryRecord {
  id: string;
  itemId: string;
  supplierName: string;
  quantity: number;
  orderedDate: string;
  /** Lead time promised by the supplier when the order was placed. */
  expectedLeadTimeDays: number;
  /** Actual lead time, only for received deliveries. */
  actualLeadTimeDays: number | null;
  /** Delivery date: actual for received orders, expected for scheduled ones. */
  deliveryDate: string;
  status: 'received' | 'scheduled';
}

export interface StockOutIncident {
  id: string;
  itemId: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  cause: string;
}
