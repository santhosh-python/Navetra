/**
 * Filtering, sorting and search for the inventory list. Pure functions: pages pass in
 * the items and the current controls, and get back the matching rows.
 */
import type { InventoryItem, RiskLevel } from '../types/inventory';
import type { ItemAnalysis } from './stockAnalysis';
import { compareRiskLevels } from './riskClassification';

export type InventorySortKey = 'urgency' | 'stock' | 'consumption' | 'stockOutDate' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface InventoryQuery {
  search: string;
  category: string;
  location: string;
  supplier: string;
  risk: RiskLevel | 'all';
  sortKey: InventorySortKey;
  sortDirection: SortDirection;
}

export const DEFAULT_INVENTORY_QUERY: InventoryQuery = {
  search: '',
  category: 'all',
  location: 'all',
  supplier: 'all',
  risk: 'all',
  sortKey: 'urgency',
  sortDirection: 'asc',
};

/** A row for the table: the item plus its analysis, so pages never recalculate stock logic. */
export interface InventoryRow {
  item: InventoryItem;
  analysis: ItemAnalysis;
}

export function matchesSearch(item: InventoryItem, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term);
}

export function filterInventoryRows(rows: InventoryRow[], query: InventoryQuery): InventoryRow[] {
  return rows.filter(({ item, analysis }) => {
    if (!matchesSearch(item, query.search)) return false;
    if (query.category !== 'all' && item.category !== query.category) return false;
    if (query.location !== 'all' && item.location !== query.location) return false;
    if (query.supplier !== 'all' && item.supplierName !== query.supplier) return false;
    if (query.risk !== 'all' && analysis.risk !== query.risk) return false;
    return true;
  });
}

/**
 * Sorts rows. Missing stock-out dates (no usage) always sort to the end, whatever the direction,
 * because they carry no urgency.
 */
export function sortInventoryRows(rows: InventoryRow[], sortKey: InventorySortKey, direction: SortDirection): InventoryRow[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sortKey) {
      case 'urgency': {
        const riskOrder = compareRiskLevels(a.analysis.risk, b.analysis.risk);
        if (riskOrder !== 0) return riskOrder * multiplier;
        return compareNumbers(a.analysis.daysOfStock ?? Infinity, b.analysis.daysOfStock ?? Infinity) * multiplier || a.item.name.localeCompare(b.item.name);
      }
      case 'stock':
        return compareNumbers(a.item.currentStock, b.item.currentStock) * multiplier || a.item.name.localeCompare(b.item.name);
      case 'consumption':
        return compareNumbers(a.item.averageDailyUsage, b.item.averageDailyUsage) * multiplier || a.item.name.localeCompare(b.item.name);
      case 'stockOutDate': {
        const aDate = a.analysis.stockOutDate;
        const bDate = b.analysis.stockOutDate;
        if (aDate === null && bDate === null) return a.item.name.localeCompare(b.item.name);
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return (aDate < bDate ? -1 : aDate > bDate ? 1 : 0) * multiplier;
      }
      case 'name':
        return a.item.name.localeCompare(b.item.name) * multiplier;
    }
  });
}

export function buildUniqueOptions(items: InventoryItem[], selector: (item: InventoryItem) => string): string[] {
  return [...new Set(items.map(selector))].sort((a, b) => a.localeCompare(b));
}

function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a < b ? -1 : 1;
}
