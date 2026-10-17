import type { AppSettings } from "../types/app";

export const DEFAULT_SETTINGS: AppSettings = {
  riskThresholds: {
    criticalBufferDays: 0,
    warningBufferDays: 3,
    safeBufferDays: 7,
  },
  forecastHorizonDays: 14,
  defaultSafetyStockDays: 3,
  notificationsEnabled: true,
  compactTable: false,
};
