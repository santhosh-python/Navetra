import type { DateOnly } from "./inventory";

/** A dated inbound shipment; quantities use the related item's unit. */
export interface IncomingDelivery {
  id: string;
  inventoryItemId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  expectedDeliveryDate: DateOnly;
  status: "ordered" | "in-transit" | "delayed" | "received";
}
