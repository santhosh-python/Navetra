/**
 * Per-item analysis: combines the stock formulas and risk rules into one structured result.
 * Pages read these results; they never recalculate stock logic themselves.
 */
import type { InventoryItem, RiskLevel } from '../types/inventory';
import type { RiskThresholds } from './riskClassification';
import { classifyRisk } from './riskClassification';
import {
  calculateDaysOfStock,
  calculateDaysUntilReplenishment,
  calculateEmergencyOrderQuantity,
  calculateInventoryPosition,
  calculateOrderValue,
  calculatePolicyReorderQuantity,
  calculateReorderPoint,
  calculateReplenishmentDate,
  calculateShortageGapDays,
  calculateShortageQuantity,
  calculateStockOutDate,
  calculateSuggestedOrderQuantity,
  calculateDemandDuringLeadTime,
} from './calculations';

export interface ItemAnalysis {
  itemId: string;
  daysOfStock: number | null;
  stockOutDate: string | null;
  replenishmentDate: string;
  daysUntilReplenishment: number;
  /** Days between stock-out and replenishment (0 when there is no gap). */
  gapDays: number;
  /** Units short before replenishment. */
  shortageQuantity: number;
  demandDuringLeadTime: number;
  inventoryPosition: number;
  reorderPoint: number;
  policyReorderQuantity: number;
  emergencyOrderQuantity: number;
  suggestedOrderQuantity: number;
  suggestedOrderValue: number;
  isBelowMinimum: boolean;
  risk: RiskLevel;
}

export interface AnalysisOptions {
  targetCoverDays: number;
}

export function analyseInventoryItem(
  item: InventoryItem,
  asOfDate: string,
  thresholds: RiskThresholds,
  options: AnalysisOptions,
): ItemAnalysis {
  const daysOfStock = calculateDaysOfStock(item.currentStock, item.averageDailyUsage);
  const stockOutDate = calculateStockOutDate(asOfDate, daysOfStock);
  const replenishmentDate = calculateReplenishmentDate(asOfDate, item.expectedDeliveryDate, item.leadTimeDays);
  const daysUntilReplenishment = calculateDaysUntilReplenishment(asOfDate, replenishmentDate);
  const gapDays = calculateShortageGapDays(stockOutDate, replenishmentDate);
  const shortageQuantity = calculateShortageQuantity(item.currentStock, item.averageDailyUsage, daysUntilReplenishment);
  const inventoryPosition = calculateInventoryPosition(item.currentStock, item.incomingQuantity);
  const reorderPoint = calculateReorderPoint(item.averageDailyUsage, item.leadTimeDays, item.safetyStock);
  const policyReorderQuantity = calculatePolicyReorderQuantity({
    dailyUsage: item.averageDailyUsage,
    leadTimeDays: item.leadTimeDays,
    safetyStock: item.safetyStock,
    currentStock: item.currentStock,
    incomingQuantity: item.incomingQuantity,
    targetCoverDays: options.targetCoverDays,
  });
  const emergencyOrderQuantity = calculateEmergencyOrderQuantity(shortageQuantity, item.safetyStock);
  const suggestedOrderQuantity = calculateSuggestedOrderQuantity(policyReorderQuantity, emergencyOrderQuantity);
  const isBelowMinimum = item.currentStock < item.minimumStock;

  return {
    itemId: item.id,
    daysOfStock,
    stockOutDate,
    replenishmentDate,
    daysUntilReplenishment,
    gapDays,
    shortageQuantity,
    demandDuringLeadTime: calculateDemandDuringLeadTime(item.averageDailyUsage, item.leadTimeDays),
    inventoryPosition,
    reorderPoint,
    policyReorderQuantity,
    emergencyOrderQuantity,
    suggestedOrderQuantity,
    suggestedOrderValue: calculateOrderValue(suggestedOrderQuantity, item.unitCost),
    isBelowMinimum,
    risk: classifyRisk(
      { daysOfStock, gapDays, currentStock: item.currentStock, minimumStock: item.minimumStock },
      thresholds,
    ),
  };
}
