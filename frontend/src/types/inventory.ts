/** A calendar date serialized as YYYY-MM-DD (not a timestamp). */
export type DateOnly = string;

export type InventoryCriticality = "low" | "medium" | "high" | "critical";
export type InventoryRiskLevel = "low" | "medium" | "high" | "critical";

/** Stock and usage values use the item's `unit` consistently. */
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  unit: string;
  currentStock: number;
  averageDailyUsage: number;
  minimumStock: number;
  safetyStock: number;
  supplierName: string;
  leadTimeDays: number;
  expectedDeliveryDate: DateOnly | null;
  incomingQuantity: number;
  /** Cost per item unit, in Indian rupees (INR). */
  unitCost: number;
  criticality: InventoryCriticality;
}
