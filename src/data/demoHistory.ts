/**
 * SYNTHETIC DEMO DATA: 30 days of daily stock history per item, plus a stock-out incident log.
 *
 * The daily history is generated with a fixed seed, so it is reproducible. It is built backwards from
 * today's stock (currentStock), so the observed history always ends at the same value the
 * forecast starts from. Values are illustrative, not measured.
 */
import { DEMO_AS_OF_DATE, addDays } from '../lib/dates';
import type { DailyObservation, DeliveryRecord, InventoryItem, StockOutIncident } from '../types/inventory';

export const HISTORY_DAYS = 30;

/** Deterministic pseudo-random generator (mulberry32). Same seed gives the same sequence. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Recorded spikes in recent consumption (demo only). Keyed by item id: multiplier for the last 7 days. */
const RECENT_CONSUMPTION_SPIKES: Record<string, number> = {
  'MED-SAL-075': 1.45,
};

/**
 * Builds HISTORY_DAYS of observations ending the day before the as-of date.
 * The last closing stock equals the item's currentStock, which is the opening stock on the as-of date.
 */
/** Stable numeric seed from a string, so an item's history does not change when other items are added or removed. */
function seedFromText(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildItemStockHistory(
  item: InventoryItem,
  deliveries: DeliveryRecord[],
  asOfDate: string = DEMO_AS_OF_DATE,
): DailyObservation[] {
  const random = createSeededRandom(seedFromText(item.sku));
  const dates = Array.from({ length: HISTORY_DAYS }, (_, index) => addDays(asOfDate, index - HISTORY_DAYS));
  const spike = RECENT_CONSUMPTION_SPIKES[item.id] ?? 1;

  const consumptions = dates.map((_, index) => {
    const noise = (random() - 0.5) * 0.4; // ±20% day-to-day variation
    const recentSpike = index >= HISTORY_DAYS - 7 ? spike : 1;
    return roundOneDecimal(Math.max(0, item.averageDailyUsage * (1 + noise) * recentSpike));
  });

  const receivedByDate = new Map<string, number>();
  for (const delivery of deliveries) {
    if (delivery.itemId !== item.id || delivery.status !== 'received') continue;
    receivedByDate.set(delivery.deliveryDate, (receivedByDate.get(delivery.deliveryDate) ?? 0) + delivery.quantity);
  }

  // Walk backwards: closing(day) = opening(next day); opening = closing + consumption - received.
  const observations: DailyObservation[] = new Array(HISTORY_DAYS);
  let closingStock = item.currentStock;
  for (let index = HISTORY_DAYS - 1; index >= 0; index -= 1) {
    const date = dates[index];
    const received = receivedByDate.get(date) ?? 0;
    const consumption = consumptions[index];
    const openingStock = closingStock + consumption - received;
    observations[index] = { date, openingStock, received, consumption };
    closingStock = openingStock;
  }
  return observations;
}

/** Builds history for every item in one pass. */
export function buildDemoStockHistoryByItem(
  items: InventoryItem[],
  deliveries: DeliveryRecord[],
  asOfDate: string = DEMO_AS_OF_DATE,
): Record<string, DailyObservation[]> {
  return Object.fromEntries(items.map((item) => [item.id, buildItemStockHistory(item, deliveries, asOfDate)]));
}

/** Stock-out incidents from the past six months. Illustrative log, not a system record. */
export const DEMO_STOCK_OUT_INCIDENTS: StockOutIncident[] = [
  { id: 'INC-01', itemId: 'EMG-O2-D', startDate: '2026-02-21', endDate: '2026-02-21', durationDays: 1, cause: 'Cylinder refill delayed by supplier' },
  { id: 'INC-02', itemId: 'MED-ORS-001', startDate: '2026-03-04', endDate: '2026-03-06', durationDays: 3, cause: 'Supplier delivery delayed' },
  { id: 'INC-03', itemId: 'LAB-DTK-330', startDate: '2026-04-11', endDate: '2026-04-18', durationDays: 8, cause: 'Import clearance delay' },
  { id: 'INC-04', itemId: 'MED-GLV-M', startDate: '2026-07-02', endDate: '2026-07-03', durationDays: 2, cause: 'Stock count error corrected' },
  { id: 'INC-05', itemId: 'MED-AMX-250', startDate: '2026-08-09', endDate: '2026-08-09', durationDays: 1, cause: 'Short shipment from supplier' },
  { id: 'INC-06', itemId: 'MED-MSK-50', startDate: '2026-06-14', endDate: '2026-06-15', durationDays: 2, cause: 'Demand spike in ward admissions' },
];

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
