import type { IncomingDelivery } from "../types/deliveries";
import { DEMO_AS_OF_DATE, demoInventory } from "./demoInventory";

/** Synthetic inbound records derived from each item's shared incoming-stock fields. */
export const demoDeliveries: readonly IncomingDelivery[] = demoInventory
  .filter((item) => item.incomingQuantity > 0 && item.expectedDeliveryDate !== null)
  .map((item, index) => {
    const expectedDate = new Date(`${item.expectedDeliveryDate}T00:00:00.000Z`);
    const daysUntilArrival = Math.ceil((expectedDate.getTime() - DEMO_AS_OF_DATE.getTime()) / 86_400_000);

    return {
      id: `demo-delivery-${index + 1}`,
      inventoryItemId: item.id,
      supplierName: item.supplierName,
      quantity: item.incomingQuantity,
      unit: item.unit,
      expectedDeliveryDate: item.expectedDeliveryDate!,
      status: daysUntilArrival <= 2 ? "in-transit" : "ordered",
    };
  });
