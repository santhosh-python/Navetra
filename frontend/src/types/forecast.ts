import type { DateOnly, InventoryRiskLevel } from "./inventory";

export interface ForecastPoint {
  date: DateOnly;
  predictedDemand: number;
  projectedStock: number;
  lowerStockEstimate?: number;
  upperStockEstimate?: number;
}

export interface ItemForecast {
  inventoryItemId: string;
  points: ForecastPoint[];
}

export interface ForecastResponse {
  generatedAt: string;
  horizonDays: number;
  items: ItemForecast[];
}

export interface RiskAssessment {
  inventoryItemId: string;
  level: InventoryRiskLevel;
  daysOfStock: number | null;
  projectedStockOutDate: DateOnly | null;
  evaluatedAt: DateOnly;
}
