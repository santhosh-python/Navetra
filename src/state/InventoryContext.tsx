import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DailyObservation, DeliveryRecord, InventoryItem, InventoryItemInput, StockOutIncident } from '../types/inventory';
import type { Recommendation } from '../types/recommendations';
import { DEMO_AS_OF_DATE } from '../lib/dates';
import { buildInventoryRows, summariseRisk, type RiskSummary } from '../lib/portfolio';
import type { InventoryRow } from '../lib/inventoryQuery';
import { buildRankedRecommendations, type RecommendationContext } from '../lib/recommendations';
import { calculateRecentUsageRatio } from '../lib/history';
import { buildScheduledDeliveries } from '../lib/deliveries';
import { buildDemoStockHistoryByItem } from '../data/demoHistory';
import * as inventoryService from '../services/inventoryService';
import { getApiBaseUrl, isBackendConfigured } from '../services/apiClient';
import { useSettings } from '../hooks/useSettings';

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface InventoryContextValue {
  status: LoadStatus;
  errorMessage: string | null;
  dataSourceLabel: string;
  isDemoData: boolean;
  /** Where the connection points, shown only in API mode (never a secret). */
  apiBaseUrlLabel: string;
  asOfDate: string;
  items: InventoryItem[];
  /** Past receipts plus scheduled deliveries. */
  deliveries: DeliveryRecord[];
  incidents: StockOutIncident[];
  historyByItemId: Record<string, DailyObservation[]>;
  rows: InventoryRow[];
  summary: RiskSummary;
  recommendations: Recommendation[];
  recommendationContext: RecommendationContext;
  getItemById: (itemId: string) => InventoryItem | undefined;
  getRowById: (itemId: string) => InventoryRow | undefined;
  locations: string[];
  categories: string[];
  suppliers: string[];
  reload: () => Promise<void>;
  addItem: (input: InventoryItemInput) => Promise<InventoryItem>;
  updateItem: (itemId: string, input: InventoryItemInput) => Promise<InventoryItem>;
  deleteItems: (itemIds: string[]) => Promise<number>;
  importItems: (inputs: InventoryItemInput[]) => Promise<number>;
  resetDemo: () => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { settings, riskThresholds } = useSettings();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [receivedDeliveries, setReceivedDeliveries] = useState<DeliveryRecord[]>([]);
  const [incidents, setIncidents] = useState<StockOutIncident[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setErrorMessage(null);
    try {
      const [loadedItems, loadedDeliveries, loadedIncidents] = await Promise.all([
        inventoryService.listInventoryItems(),
        inventoryService.listDeliveryHistory(),
        inventoryService.listStockOutIncidents(),
      ]);
      setItems(loadedItems);
      setReceivedDeliveries(loadedDeliveries);
      setIncidents(loadedIncidents);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The inventory data could not be loaded.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const deliveries = useMemo(
    () => [...receivedDeliveries, ...buildScheduledDeliveries(items)],
    [receivedDeliveries, items],
  );

  const historyByItemId = useMemo(
    () => buildDemoStockHistoryByItem(items, receivedDeliveries, DEMO_AS_OF_DATE),
    [items, receivedDeliveries],
  );

  const rows = useMemo(
    () => buildInventoryRows(items, DEMO_AS_OF_DATE, riskThresholds, settings.targetCoverDays),
    [items, riskThresholds, settings.targetCoverDays],
  );

  const summary = useMemo(() => summariseRisk(rows), [rows]);

  const recentUsageRatioByItemId = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, calculateRecentUsageRatio(historyByItemId[item.id] ?? [])])),
    [items, historyByItemId],
  );

  const recommendationContext = useMemo<RecommendationContext>(
    () => ({
      asOfDate: DEMO_AS_OF_DATE,
      thresholds: riskThresholds,
      targetCoverDays: settings.targetCoverDays,
      recentUsageRatioByItemId,
    }),
    [riskThresholds, settings.targetCoverDays, recentUsageRatioByItemId],
  );

  const recommendations = useMemo(
    () => buildRankedRecommendations(items, recommendationContext),
    [items, recommendationContext],
  );

  const itemIndex = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const rowIndex = useMemo(() => new Map(rows.map((row) => [row.item.id, row])), [rows]);

  const locations = useMemo(
    () => [...new Set([...settings.locations, ...items.map((item) => item.location)])].sort((a, b) => a.localeCompare(b)),
    [settings.locations, items],
  );
  const categories = useMemo(
    () => [...new Set([...settings.categories, ...items.map((item) => item.category)])].sort((a, b) => a.localeCompare(b)),
    [settings.categories, items],
  );
  const suppliers = useMemo(
    () => [...new Set(items.map((item) => item.supplierName))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const refreshItems = useCallback(async () => {
    setItems(await inventoryService.listInventoryItems());
  }, []);

  const addItem = useCallback(
    async (input: InventoryItemInput) => {
      const created = await inventoryService.createInventoryItem(input);
      await refreshItems();
      return created;
    },
    [refreshItems],
  );

  const updateItem = useCallback(
    async (itemId: string, input: InventoryItemInput) => {
      const updated = await inventoryService.updateInventoryItem(itemId, input);
      await refreshItems();
      return updated;
    },
    [refreshItems],
  );

  const deleteItems = useCallback(
    async (itemIds: string[]) => {
      const deleted = await inventoryService.deleteInventoryItems(itemIds);
      await refreshItems();
      return deleted;
    },
    [refreshItems],
  );

  const importItems = useCallback(
    async (inputs: InventoryItemInput[]) => {
      const added = await inventoryService.importInventoryItems(inputs);
      await refreshItems();
      return added;
    },
    [refreshItems],
  );

  const resetDemo = useCallback(async () => {
    await inventoryService.resetDemoItems();
    await refreshItems();
  }, [refreshItems]);

  const value = useMemo<InventoryContextValue>(
    () => ({
      status,
      errorMessage,
      dataSourceLabel: inventoryService.getDataSourceLabel(),
      isDemoData: !isBackendConfigured(),
      apiBaseUrlLabel: getApiBaseUrl(),
      asOfDate: DEMO_AS_OF_DATE,
      items,
      deliveries,
      incidents,
      historyByItemId,
      rows,
      summary,
      recommendations,
      recommendationContext,
      getItemById: (itemId) => itemIndex.get(itemId),
      getRowById: (itemId) => rowIndex.get(itemId),
      locations,
      categories,
      suppliers,
      reload: load,
      addItem,
      updateItem,
      deleteItems,
      importItems,
      resetDemo,
    }),
    [
      status, errorMessage, items, deliveries, incidents, historyByItemId, rows, summary, recommendations,
      recommendationContext, itemIndex, rowIndex, locations, categories, suppliers, load, addItem, updateItem,
      deleteItems, importItems, resetDemo,
    ],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}
