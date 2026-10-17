/**
 * Report builders. Each report is a table built from the same analysis as the rest of the app.
 * Cells keep a display string (for the screen and print) and a raw value (for CSV export).
 */
import type { DailyObservation, InventoryItem } from '../types/inventory';
import type { Recommendation } from '../types/recommendations';
import { formatLongDate, formatShortDate, diffDays } from './dates';
import { formatCurrency, formatDailyRate, formatDecimal, formatInteger, formatWholeDaysRemaining } from './formatters';
import { RISK_LABELS } from './riskClassification';
import type { InventoryRow } from './inventoryQuery';
import { calculateAverage } from './calculations';
import { calculateDemandVariabilityPercent } from './history';
import { buildForecastAssumptions } from './forecastExplanation';

export const REPORT_TYPES = [
  { id: 'inventory-status', label: 'Current inventory status', description: 'Stock, use and risk for every item.' },
  { id: 'critical-shortages', label: 'Critical shortage report', description: 'Items that run out before replenishment or are at critical level.' },
  { id: 'upcoming-replenishment', label: 'Upcoming replenishment', description: 'Scheduled deliveries inside the selected window.' },
  { id: 'reorder-recommendations', label: 'Reorder recommendations', description: 'Suggested order quantities and their value.' },
  { id: 'consumption-summary', label: 'Consumption summary', description: 'Average and recent use from the 30-day record.' },
  { id: 'forecast-assumptions', label: 'Forecast assumptions', description: 'The inputs and method behind every estimate.' },
] as const;

export type ReportType = (typeof REPORT_TYPES)[number]['id'];

export interface ReportCell {
  display: string;
  raw: string | number;
}

export interface ReportColumn {
  key: string;
  label: string;
  align: 'left' | 'right';
}

export interface ReportTable {
  columns: ReportColumn[];
  rows: Record<string, ReportCell>[];
}

export interface ReportInput {
  rows: InventoryRow[];
  recommendations: Recommendation[];
  historyByItemId: Record<string, DailyObservation[]>;
  asOfDate: string;
  horizonDays: number;
  /** Window for the upcoming replenishment report, in days. */
  replenishmentWindowDays: number;
}

const text = (value: string): ReportCell => ({ display: value, raw: value });
const number = (value: number, display = formatInteger(value)): ReportCell => ({ display, raw: value });

export function buildReport(type: ReportType, input: ReportInput): ReportTable {
  switch (type) {
    case 'inventory-status':
      return buildInventoryStatus(input);
    case 'critical-shortages':
      return buildCriticalShortages(input);
    case 'upcoming-replenishment':
      return buildUpcomingReplenishment(input);
    case 'reorder-recommendations':
      return buildReorderRecommendations(input);
    case 'consumption-summary':
      return buildConsumptionSummary(input);
    case 'forecast-assumptions':
      return buildForecastAssumptionsReport(input);
  }
}

function buildInventoryStatus({ rows }: ReportInput): ReportTable {
  return {
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'sku', label: 'SKU', align: 'left' },
      { key: 'category', label: 'Category', align: 'left' },
      { key: 'location', label: 'Location', align: 'left' },
      { key: 'stock', label: 'Stock', align: 'right' },
      { key: 'unit', label: 'Unit', align: 'left' },
      { key: 'usage', label: 'Daily use', align: 'right' },
      { key: 'days', label: 'Days of stock', align: 'right' },
      { key: 'risk', label: 'Risk', align: 'left' },
    ],
    rows: rows.map(({ item, analysis }) => ({
      item: text(item.name),
      sku: text(item.sku),
      category: text(item.category),
      location: text(item.location),
      stock: number(item.currentStock, formatDecimal(item.currentStock)),
      unit: text(item.unit),
      usage: number(item.averageDailyUsage, formatDecimal(item.averageDailyUsage)),
      days: analysis.daysOfStock === null ? text('No use recorded') : number(Math.floor(analysis.daysOfStock), formatWholeDaysRemaining(analysis.daysOfStock)),
      risk: text(RISK_LABELS[analysis.risk]),
    })),
  };
}

function buildCriticalShortages({ rows }: ReportInput): ReportTable {
  const shortageRows = rows
    .filter(({ analysis }) => analysis.risk === 'critical')
    .sort((a, b) => b.analysis.gapDays - a.analysis.gapDays || a.item.name.localeCompare(b.item.name));
  return {
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'location', label: 'Location', align: 'left' },
      { key: 'stockOut', label: 'Stock-out date', align: 'left' },
      { key: 'replenishment', label: 'Replenishment date', align: 'left' },
      { key: 'gap', label: 'Gap (days)', align: 'right' },
      { key: 'shortage', label: 'Units short', align: 'right' },
      { key: 'services', label: 'Services affected', align: 'right' },
    ],
    rows: shortageRows.map(({ item, analysis }) => ({
      item: text(item.name),
      location: text(item.location),
      stockOut: text(formatLongDate(analysis.stockOutDate)),
      replenishment: text(formatLongDate(analysis.replenishmentDate)),
      gap: number(analysis.gapDays),
      shortage: number(analysis.shortageQuantity, `${formatInteger(analysis.shortageQuantity)} ${item.unit}`),
      services: number(item.servicesAffected),
    })),
  };
}

function buildUpcomingReplenishment({ rows, asOfDate, replenishmentWindowDays }: ReportInput): ReportTable {
  const inWindow = rows
    .filter(({ item, analysis }) => item.incomingQuantity > 0 && item.expectedDeliveryDate !== null && analysis.daysUntilReplenishment <= replenishmentWindowDays)
    .sort((a, b) => a.analysis.daysUntilReplenishment - b.analysis.daysUntilReplenishment);
  return {
    columns: [
      { key: 'date', label: 'Delivery date', align: 'left' },
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'supplier', label: 'Supplier', align: 'left' },
      { key: 'quantity', label: 'Incoming', align: 'right' },
      { key: 'inDays', label: 'Days from today', align: 'right' },
      { key: 'coverage', label: 'Stock covers until', align: 'left' },
    ],
    rows: inWindow.map(({ item, analysis }) => ({
      date: text(formatLongDate(item.expectedDeliveryDate)),
      item: text(item.name),
      supplier: text(item.supplierName),
      quantity: number(item.incomingQuantity, `${formatInteger(item.incomingQuantity)} ${item.unit}`),
      inDays: number(diffDays(asOfDate, item.expectedDeliveryDate ?? asOfDate)),
      coverage: text(analysis.stockOutDate ? formatShortDate(analysis.stockOutDate) : 'No use recorded'),
    })),
  };
}

function buildReorderRecommendations({ recommendations }: ReportInput): ReportTable {
  const orders = recommendations.filter((recommendation) => recommendation.suggestedReorderQuantity > 0);
  return {
    columns: [
      { key: 'rank', label: 'Rank', align: 'right' },
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'action', label: 'Recommended action', align: 'left' },
      { key: 'quantity', label: 'Suggested quantity', align: 'right' },
      { key: 'value', label: 'Estimated value (₹)', align: 'right' },
      { key: 'score', label: 'Priority (of 100)', align: 'right' },
    ],
    rows: orders.map((recommendation, index) => ({
      rank: number(index + 1),
      item: text(recommendation.itemName),
      action: text(recommendation.action),
      quantity: number(recommendation.suggestedReorderQuantity),
      value: number(recommendation.suggestedReorderValue, formatCurrency(recommendation.suggestedReorderValue)),
      score: number(recommendation.priorityScore),
    })),
  };
}

function buildConsumptionSummary({ rows, historyByItemId }: ReportInput): ReportTable {
  return {
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'planned', label: 'Planned daily use', align: 'right' },
      { key: 'observed', label: 'Observed average (30 days)', align: 'right' },
      { key: 'peak', label: 'Highest day', align: 'right' },
      { key: 'variability', label: 'Variability (%)', align: 'right' },
    ],
    rows: rows.map(({ item }) => {
      const history = historyByItemId[item.id] ?? [];
      const observedAverage = calculateAverage(history.map((day) => day.consumption));
      const peak = history.length ? Math.max(...history.map((day) => day.consumption)) : null;
      const variability = calculateDemandVariabilityPercent(history);
      return {
        item: text(item.name),
        planned: number(item.averageDailyUsage, formatDailyRate(item.averageDailyUsage, item.unit)),
        observed: observedAverage === null ? text('No record') : number(observedAverage, formatDailyRate(Math.round(observedAverage * 10) / 10, item.unit)),
        peak: peak === null ? text('No record') : number(peak, `${formatDecimal(peak)} ${item.unit}`),
        variability: variability === null ? text('No record') : number(variability, `${formatDecimal(variability)}%`),
      };
    }),
  };
}

function buildForecastAssumptionsReport({ rows, asOfDate, horizonDays }: ReportInput): ReportTable {
  return {
    columns: [
      { key: 'item', label: 'Item', align: 'left' },
      { key: 'usage', label: 'Daily use assumed', align: 'left' },
      { key: 'stock', label: 'Usable stock', align: 'left' },
      { key: 'delivery', label: 'Expected delivery', align: 'left' },
      { key: 'horizon', label: 'Horizon', align: 'left' },
    ],
    rows: rows.map(({ item, analysis }) => {
      const assumptions = buildForecastAssumptions(item, analysis, horizonDays, asOfDate);
      return {
        item: text(item.name),
        usage: text(assumptions[0].value),
        stock: text(assumptions[1].value),
        delivery: text(assumptions[2].value),
        horizon: text(assumptions[3].value),
      };
    }),
  };
}

export function reportToCsvRows(table: ReportTable): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: table.columns.map((column) => column.label),
    rows: table.rows.map((row) => table.columns.map((column) => row[column.key]?.raw ?? '')),
  };
}

export function itemNameById(items: InventoryItem[]): Map<string, string> {
  return new Map(items.map((item) => [item.id, item.name]));
}
