/**
 * Plain-language forecast explanation. Every number comes from the same analysis the tables use,
 * so the text can never contradict the displayed values.
 */
import type { InventoryItem } from '../types/inventory';
import type { ItemAnalysis } from './stockAnalysis';
import { formatLongDate } from './dates';
import { formatDecimal, formatQuantity, formatWholeDaysRemaining } from './formatters';

export function generateForecastExplanation(item: InventoryItem, analysis: ItemAnalysis): string {
  if (analysis.daysOfStock === null) {
    return `No daily consumption is recorded for ${item.name}, so stock duration cannot be estimated. Record usage to produce a forecast.`;
  }
  const daysOfStock = formatWholeDaysRemaining(analysis.daysOfStock);
  const replenishmentText = item.expectedDeliveryDate
    ? `Replenishment is expected in ${analysis.daysUntilReplenishment} day${analysis.daysUntilReplenishment === 1 ? '' : 's'} (${formatLongDate(analysis.replenishmentDate)})`
    : `No delivery is scheduled. The earliest new order would arrive in ${analysis.daysUntilReplenishment} day${analysis.daysUntilReplenishment === 1 ? '' : 's'} (${item.leadTimeDays}-day lead time)`;

  if (analysis.gapDays > 0) {
    return `Current stock is estimated to last approximately ${daysOfStock}. ${replenishmentText}, creating a potential ${analysis.gapDays}-day supply gap if consumption remains unchanged. About ${formatQuantity(analysis.shortageQuantity, item.unit)} would be short before replenishment.`;
  }
  return `Current stock is estimated to last approximately ${daysOfStock}. ${replenishmentText}, before stock is projected to run out. No supply gap is projected if consumption remains unchanged.`;
}

export interface ForecastAssumption {
  label: string;
  value: string;
}

export function buildForecastAssumptions(item: InventoryItem, analysis: ItemAnalysis, horizonDays: number, asOfDate: string): ForecastAssumption[] {
  return [
    { label: 'Estimated daily consumption', value: `${formatDecimal(item.averageDailyUsage)} ${item.unit}/day (recorded average)` },
    { label: 'Current usable stock', value: formatQuantity(item.currentStock, item.unit) },
    {
      label: 'Expected delivery date',
      value: item.expectedDeliveryDate
        ? `${formatLongDate(item.expectedDeliveryDate)}, ${formatQuantity(item.incomingQuantity, item.unit)}`
        : `None scheduled (earliest order arrival ${formatLongDate(analysis.replenishmentDate)})`,
    },
    { label: 'Forecast horizon', value: `${horizonDays} days from ${formatLongDate(asOfDate)}` },
    { label: 'Method', value: 'Rule-based estimate. Stock minus constant daily consumption. Not a machine-learning prediction.' },
  ];
}
