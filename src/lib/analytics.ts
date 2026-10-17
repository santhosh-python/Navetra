/**
 * Analytics aggregations. Each function returns plain data for one chart or table.
 * Observed data (history, deliveries, incidents) is kept separate from estimates (projections).
 */
import type { DailyObservation, DeliveryRecord, InventoryItem, RiskLevel, StockOutIncident } from '../types/inventory';
import { RISK_LABELS } from './riskClassification';
import type { InventoryRow } from './inventoryQuery';
import { calculateAverage, calculateInventoryTurnover } from './calculations';
import { calculateDemandVariabilityPercent } from './history';

export const CRITICALITY_SCORE: Record<InventoryItem['criticality'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export const SCATTER_DAYS_CAP = 30;

export interface CategoryRiskRow {
  category: string;
  critical: number;
  warning: number;
  safe: number;
}

export function buildCategoryRiskRows(rows: InventoryRow[]): CategoryRiskRow[] {
  const byCategory = new Map<string, CategoryRiskRow>();
  for (const { item, analysis } of rows) {
    const entry = byCategory.get(item.category) ?? { category: item.category, critical: 0, warning: 0, safe: 0 };
    entry[analysis.risk] += 1;
    byCategory.set(item.category, entry);
  }
  return [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category));
}

export interface CriticalityScatterPoint {
  itemId: string;
  name: string;
  criticalityScore: number;
  criticalityLabel: string;
  daysOfStock: number;
  risk: RiskLevel;
  /** Jitter offset so items with identical values remain visible. Deterministic. */
  jitter: number;
}

export function buildCriticalityScatter(rows: InventoryRow[]): CriticalityScatterPoint[] {
  return rows.map(({ item, analysis }, index) => ({
    itemId: item.id,
    name: item.name,
    criticalityScore: CRITICALITY_SCORE[item.criticality],
    criticalityLabel: item.criticality.charAt(0).toUpperCase() + item.criticality.slice(1),
    daysOfStock: Math.min(SCATTER_DAYS_CAP, Math.floor(analysis.daysOfStock ?? SCATTER_DAYS_CAP)),
    risk: analysis.risk,
    jitter: ((index * 37) % 11) / 11 - 0.5,
  }));
}

export interface TurnoverRow {
  itemId: string;
  name: string;
  category: string;
  turnover: number | null;
}

export function buildTurnoverRows(rows: InventoryRow[]): TurnoverRow[] {
  return rows.map(({ item }) => ({
    itemId: item.id,
    name: item.name,
    category: item.category,
    turnover: calculateInventoryTurnover(item.averageDailyUsage, item.currentStock),
  }));
}

export interface VariabilityRow {
  itemId: string;
  name: string;
  variabilityPercent: number | null;
}

export function buildVariabilityRows(items: InventoryItem[], historyByItemId: Record<string, DailyObservation[]>): VariabilityRow[] {
  return items
    .map((item) => ({
      itemId: item.id,
      name: item.name,
      variabilityPercent: calculateDemandVariabilityPercent(historyByItemId[item.id] ?? []),
    }))
    .sort((a, b) => (b.variabilityPercent ?? -1) - (a.variabilityPercent ?? -1));
}

/** Sum of consumption across the chosen items for each history date. */
export function buildConsumptionSeries(
  itemIds: string[],
  historyByItemId: Record<string, DailyObservation[]>,
): { date: string; consumption: number }[] {
  const totals = new Map<string, number>();
  for (const itemId of itemIds) {
    for (const day of historyByItemId[itemId] ?? []) {
      totals.set(day.date, (totals.get(day.date) ?? 0) + day.consumption);
    }
  }
  return [...totals.entries()]
    .map(([date, consumption]) => ({ date, consumption: Math.round(consumption * 10) / 10 }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface LeadTimeChartRow {
  supplierName: string;
  expectedDays: number;
  actualDays: number;
  lateCount: number;
  receivedCount: number;
}

export interface StockOutHistoryRow {
  incidentId: string;
  itemName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  cause: string;
}

export function buildStockOutHistoryRows(incidents: StockOutIncident[], items: InventoryItem[]): StockOutHistoryRow[] {
  const names = new Map(items.map((item) => [item.id, item.name]));
  return incidents
    .map((incident) => ({
      incidentId: incident.id,
      itemName: names.get(incident.itemId) ?? 'Item no longer in inventory',
      startDate: incident.startDate,
      endDate: incident.endDate,
      durationDays: incident.durationDays,
      cause: incident.cause,
    }))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
}

export function averageIncidentDuration(incidents: StockOutIncident[]): number | null {
  return calculateAverage(incidents.map((incident) => incident.durationDays));
}

export function countDeliveriesByStatus(deliveries: DeliveryRecord[]): Record<DeliveryRecord['status'], number> {
  return {
    received: deliveries.filter((delivery) => delivery.status === 'received').length,
    scheduled: deliveries.filter((delivery) => delivery.status === 'scheduled').length,
  };
}

export const RISK_CHART_ORDER: RiskLevel[] = ['critical', 'warning', 'safe'];
export { RISK_LABELS };
