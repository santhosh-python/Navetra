/**
 * Inventory data boundary.
 *
 * Demo mode (no VITE_API_BASE_URL): reads and writes an in-memory copy of the synthetic dataset.
 * Changes last until the page is reloaded. Nothing is sent to a server.
 *
 * API mode (VITE_API_BASE_URL set): the same functions call the planned backend endpoints below.
 * The endpoints do not exist yet, so API mode is a documented contract, not a working integration.
 *
 *   GET    /inventory/items            -> InventoryItem[]
 *   POST   /inventory/items            -> InventoryItem
 *   PUT    /inventory/items/{id}       -> InventoryItem
 *   DELETE /inventory/items?ids=...    -> { deleted: number }
 *   POST   /inventory/import           -> { added: number }   (validated server-side)
 *   GET    /inventory/deliveries       -> DeliveryRecord[]
 *   GET    /inventory/incidents        -> StockOutIncident[]
 */
import { DEMO_ITEMS } from '../data/demoInventory';
import { DEMO_DELIVERY_HISTORY } from '../data/demoDeliveries';
import { DEMO_STOCK_OUT_INCIDENTS } from '../data/demoHistory';
import type { DeliveryRecord, InventoryItem, InventoryItemInput, StockOutIncident } from '../types/inventory';
import { ApiError, isBackendConfigured, requestJson } from './apiClient';

/** Simulated response time for the demo adapter, so loading states are visible and tested. */
const DEMO_RESPONSE_DELAY_MS = 350;

let demoItemStore: InventoryItem[] = DEMO_ITEMS.map((item) => ({ ...item }));
let nextDemoNumber = 1;

function withDemoDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(structuredClone(value)), DEMO_RESPONSE_DELAY_MS);
  });
}

function createItemId(input: InventoryItemInput): string {
  nextDemoNumber += 1;
  return `ITEM-${input.sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-${Date.now().toString(36)}-${nextDemoNumber}`;
}

export function getDataSourceLabel(): string {
  return isBackendConfigured() ? 'Backend API' : 'Demo data (synthetic)';
}

export async function listInventoryItems(): Promise<InventoryItem[]> {
  if (isBackendConfigured()) return requestJson<InventoryItem[]>('/inventory/items');
  return withDemoDelay(demoItemStore);
}

export async function createInventoryItem(input: InventoryItemInput): Promise<InventoryItem> {
  if (isBackendConfigured()) {
    return requestJson<InventoryItem>('/inventory/items', { method: 'POST', body: JSON.stringify(input) });
  }
  const item: InventoryItem = { ...input, id: createItemId(input) };
  demoItemStore = [...demoItemStore, item];
  return withDemoDelay(item);
}

export async function updateInventoryItem(id: string, input: InventoryItemInput): Promise<InventoryItem> {
  if (isBackendConfigured()) {
    return requestJson<InventoryItem>(`/inventory/items/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) });
  }
  const existing = demoItemStore.find((item) => item.id === id);
  if (!existing) throw new ApiError('This item no longer exists.', 404);
  const updated: InventoryItem = { ...input, id };
  demoItemStore = demoItemStore.map((item) => (item.id === id ? updated : item));
  return withDemoDelay(updated);
}

export async function deleteInventoryItems(ids: string[]): Promise<number> {
  if (isBackendConfigured()) {
    const query = encodeURIComponent(ids.join(','));
    const result = await requestJson<{ deleted: number }>(`/inventory/items?ids=${query}`, { method: 'DELETE' });
    return result.deleted;
  }
  const before = demoItemStore.length;
  demoItemStore = demoItemStore.filter((item) => !ids.includes(item.id));
  return withDemoDelay(before - demoItemStore.length);
}

/**
 * Adds validated rows. Callers must only pass rows that passed validation. This function never
 * reports success for rows it did not receive.
 */
export async function importInventoryItems(inputs: InventoryItemInput[]): Promise<number> {
  if (isBackendConfigured()) {
    const result = await requestJson<{ added: number }>('/inventory/import', { method: 'POST', body: JSON.stringify(inputs) });
    return result.added;
  }
  const added = inputs.map((input) => ({ ...input, id: createItemId(input) }));
  demoItemStore = [...demoItemStore, ...added];
  return withDemoDelay(added.length);
}

export async function resetDemoItems(): Promise<InventoryItem[]> {
  demoItemStore = DEMO_ITEMS.map((item) => ({ ...item }));
  return withDemoDelay(demoItemStore);
}

export async function listDeliveryHistory(): Promise<DeliveryRecord[]> {
  if (isBackendConfigured()) return requestJson<DeliveryRecord[]>('/inventory/deliveries');
  return withDemoDelay(DEMO_DELIVERY_HISTORY);
}

export async function listStockOutIncidents(): Promise<StockOutIncident[]> {
  if (isBackendConfigured()) return requestJson<StockOutIncident[]>('/inventory/incidents');
  return withDemoDelay(DEMO_STOCK_OUT_INCIDENTS);
}
