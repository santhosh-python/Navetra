/**
 * Forecast boundary. Today the forecast is calculated in the browser with the rule-based method in
 * lib/forecasting.ts. When the Python API exists, `getForecastSnapshot` should call it instead;
 * the page components will not need to change.
 */
import type { InventoryItem } from '../types/inventory';
import type { ForecastSnapshot } from '../types/forecast';
import type { RiskThresholds } from '../lib/riskClassification';
import { buildForecastSnapshot } from '../lib/forecasting';

export function getForecastSnapshot(
  item: InventoryItem,
  asOfDate: string,
  thresholds: RiskThresholds,
  horizonDays: number,
  targetCoverDays: number,
): ForecastSnapshot {
  return buildForecastSnapshot(item, asOfDate, thresholds, horizonDays, targetCoverDays);
}
