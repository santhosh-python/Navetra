/** Delivery helpers: scheduled deliveries and supplier lead-time comparison. */
import type { DeliveryRecord, InventoryItem } from '../types/inventory';
import { addDays } from './dates';
import { calculateAverage } from './calculations';

/**
 * Scheduled deliveries derived from the inventory records. The order date is not stored in the
 * record, so it is implied as the delivery date minus the item's lead time.
 */
export function buildScheduledDeliveries(items: InventoryItem[]): DeliveryRecord[] {
  return items
    .filter((item) => item.expectedDeliveryDate !== null && item.incomingQuantity > 0)
    .map((item) => ({
      id: `SCH-${item.id}`,
      itemId: item.id,
      supplierName: item.supplierName,
      quantity: item.incomingQuantity,
      orderedDate: addDays(item.expectedDeliveryDate as string, -item.leadTimeDays),
      expectedLeadTimeDays: item.leadTimeDays,
      actualLeadTimeDays: null,
      deliveryDate: item.expectedDeliveryDate as string,
      status: 'scheduled' as const,
    }));
}

export interface SupplierLeadTimeSummary {
  supplierName: string;
  receivedCount: number;
  averageExpectedDays: number;
  averageActualDays: number;
  lateCount: number;
}

/** Compares promised and actual lead times for received deliveries, grouped by supplier. */
export function summariseSupplierLeadTimes(deliveries: DeliveryRecord[]): SupplierLeadTimeSummary[] {
  const received = deliveries.filter(
    (delivery): delivery is DeliveryRecord & { actualLeadTimeDays: number } =>
      delivery.status === 'received' && delivery.actualLeadTimeDays !== null,
  );
  const bySupplier = new Map<string, typeof received>();
  for (const delivery of received) {
    const list = bySupplier.get(delivery.supplierName) ?? [];
    list.push(delivery);
    bySupplier.set(delivery.supplierName, list);
  }
  return [...bySupplier.entries()]
    .map(([supplierName, list]) => ({
      supplierName,
      receivedCount: list.length,
      averageExpectedDays: round(calculateAverage(list.map((delivery) => delivery.expectedLeadTimeDays)) ?? 0),
      averageActualDays: round(calculateAverage(list.map((delivery) => delivery.actualLeadTimeDays)) ?? 0),
      lateCount: list.filter((delivery) => delivery.actualLeadTimeDays > delivery.expectedLeadTimeDays).length,
    }))
    .sort((a, b) => a.supplierName.localeCompare(b.supplierName));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
