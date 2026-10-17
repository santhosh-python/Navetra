import type { InventoryItem } from "./inventory";

export interface RiskThresholdSettings {
  /** Days of coverage beyond supplier lead time that count as Critical. */
  criticalBufferDays: number;
  /** Days of coverage beyond supplier lead time that count as elevated risk. */
  warningBufferDays: number;
  /** Additional coverage window used to distinguish Warning from Safe. */
  safeBufferDays: number;
}

export interface AppSettings {
  riskThresholds: RiskThresholdSettings;
  forecastHorizonDays: number;
  defaultSafetyStockDays: number;
  notificationsEnabled: boolean;
  compactTable: boolean;
}

export interface DemoOrganization {
  id: string;
  name: string;
  description: string;
  locations: string[] | null;
}

export interface SavedScenario {
  id: string;
  name: string;
  inventoryItemId: string;
  demandChangePercent: number;
  deliveryDelayDays: number;
  additionalOrderQuantity: number;
  safetyStock: number;
  createdAt: string;
}

export type RecommendationActionStatus = "reviewed" | "snoozed" | "recorded";

export interface ActivityEntry {
  id: string;
  inventoryItemId: string;
  description: string;
  createdAt: string;
  source: "local-demo";
}

export type InventoryItemPatch = Partial<Omit<InventoryItem, "id">>;
