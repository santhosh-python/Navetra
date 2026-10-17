/**
 * Recommendation rules. Each at-risk item gets ONE recommended action, chosen by the first matching rule.
 * The wording never claims that an order was placed or a supplier was contacted.
 */
import type { InventoryItem } from '../types/inventory';
import type { Recommendation, RecommendedAction } from '../types/recommendations';
import { diffDays, formatLongDate } from './dates';
import { formatDecimal, formatQuantity, formatWholeDaysRemaining, formatCurrency } from './formatters';
import { analyseInventoryItem, type ItemAnalysis } from './stockAnalysis';
import type { RiskThresholds } from './riskClassification';
import { buildPriorityFactors, PRIORITY_MAX_SCORE, sumPriorityPoints } from './priorityScoring';

/** Recent consumption at least this many times the 30-day average is flagged as unusual. */
export const UNUSUAL_CONSUMPTION_RATIO = 1.25;
/** Stock counts older than this many days are flagged for a record check. */
export const STOCK_COUNT_MAX_AGE_DAYS = 30;
/** Safety stock should cover at least this many days of demand. */
export const MINIMUM_SAFETY_STOCK_DAYS = 3;

export interface RecommendationContext {
  asOfDate: string;
  thresholds: RiskThresholds;
  targetCoverDays: number;
  /** Last 7 days average consumption ÷ 30-day average, per item id (null when no history). */
  recentUsageRatioByItemId: Record<string, number | null>;
}

/** Chooses the single recommended action using the rules in priority order. */
export function chooseRecommendedAction(
  item: InventoryItem,
  analysis: ItemAnalysis,
  context: RecommendationContext,
): RecommendedAction {
  const hasGap = analysis.gapDays > 0;
  const hasScheduledDelivery = item.expectedDeliveryDate !== null && item.incomingQuantity > 0;

  if (hasGap && analysis.shortageQuantity > 0 && item.stockHeldElsewhere >= analysis.shortageQuantity) {
    return 'Transfer stock from another location';
  }
  if (hasGap && hasScheduledDelivery) return 'Confirm supplier dispatch';
  if (hasGap) return 'Reorder now';
  if (analysis.suggestedOrderQuantity > 0 && (analysis.isBelowMinimum || analysis.inventoryPosition < analysis.reorderPoint)) {
    return 'Reorder now';
  }

  const ratio = context.recentUsageRatioByItemId[item.id];
  if (ratio !== null && ratio !== undefined && ratio >= UNUSUAL_CONSUMPTION_RATIO) {
    return 'Investigate unusually high consumption';
  }
  if (diffDays(item.lastCountDate, context.asOfDate) > STOCK_COUNT_MAX_AGE_DAYS) {
    return 'Check stock records';
  }
  if (item.safetyStock < item.averageDailyUsage * MINIMUM_SAFETY_STOCK_DAYS) {
    return 'Increase safety stock';
  }
  return 'Monitor the next delivery';
}

/** Plain-language reason, generated from the item's own values. */
export function buildRecommendationReason(item: InventoryItem, analysis: ItemAnalysis, context: RecommendationContext): string {
  const { thresholds } = context;
  if (analysis.gapDays > 0 && item.expectedDeliveryDate) {
    return `Stock is projected to run out in ${formatWholeDaysRemaining(analysis.daysOfStock)}, ${analysis.gapDays} day${analysis.gapDays === 1 ? '' : 's'} before the delivery due ${formatLongDate(item.expectedDeliveryDate)}.`;
  }
  if (analysis.gapDays > 0) {
    return `No delivery is scheduled. Stock lasts ${formatWholeDaysRemaining(analysis.daysOfStock)}, but a new order would take ${item.leadTimeDays} days to arrive.`;
  }
  if (analysis.daysOfStock !== null && analysis.daysOfStock <= thresholds.criticalDays) {
    return `Stock lasts only ${formatWholeDaysRemaining(analysis.daysOfStock)}, within the critical threshold of ${thresholds.criticalDays} days.`;
  }
  if (analysis.isBelowMinimum) {
    return `Stock is ${formatDecimal(item.minimumStock - item.currentStock)} ${item.unit} below the minimum level of ${formatDecimal(item.minimumStock)} ${item.unit}.`;
  }
  if (analysis.daysOfStock !== null) {
    return `Stock lasts ${formatWholeDaysRemaining(analysis.daysOfStock)}, within the warning threshold of ${thresholds.warningDays} days.`;
  }
  return 'Stock needs a periodic check.';
}

export function buildRecommendation(item: InventoryItem, context: RecommendationContext): Recommendation {
  const analysis = analyseInventoryItem(item, context.asOfDate, context.thresholds, {
    targetCoverDays: context.targetCoverDays,
  });
  const priorityFactors = buildPriorityFactors(item, analysis, context.thresholds);
  return {
    itemId: item.id,
    sku: item.sku,
    itemName: item.name,
    criticality: item.criticality,
    risk: analysis.risk,
    priorityScore: Math.min(PRIORITY_MAX_SCORE, sumPriorityPoints(priorityFactors)),
    priorityFactors,
    daysUntilStockOut: analysis.daysOfStock === null ? null : Math.floor(analysis.daysOfStock),
    stockOutDate: analysis.stockOutDate,
    replenishmentDate: analysis.replenishmentDate,
    gapDays: analysis.gapDays,
    action: chooseRecommendedAction(item, analysis, context),
    reason: buildRecommendationReason(item, analysis, context),
    suggestedReorderQuantity: analysis.suggestedOrderQuantity,
    suggestedReorderValue: analysis.suggestedOrderValue,
  };
}

/**
 * Builds the ranked list: only Critical and Warning items, highest priority score first.
 * Ties are broken by the earliest stock-out, then by name.
 */
export function buildRankedRecommendations(items: InventoryItem[], context: RecommendationContext): Recommendation[] {
  return items
    .map((item) => buildRecommendation(item, context))
    .filter((recommendation) => recommendation.risk !== 'safe')
    .sort((a, b) => {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      const aDays = a.daysUntilStockOut ?? Number.MAX_SAFE_INTEGER;
      const bDays = b.daysUntilStockOut ?? Number.MAX_SAFE_INTEGER;
      if (aDays !== bDays) return aDays - bDays;
      return a.itemName.localeCompare(b.itemName);
    });
}

export function describeSuggestedOrder(recommendation: Recommendation, unit: string): string {
  if (recommendation.suggestedReorderQuantity <= 0) return 'No order suggested';
  return `${formatQuantity(recommendation.suggestedReorderQuantity, unit)} (${formatCurrency(recommendation.suggestedReorderValue)})`;
}
