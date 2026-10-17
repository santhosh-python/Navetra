import { demoInventory } from "../data/demoInventory";
import type { InventoryItem } from "../types/inventory";

export type InventoryDataSource = "demo" | "api" | "imported" | "edited";

export interface InventoryDataset {
  items: InventoryItem[];
  source: InventoryDataSource;
}

/**
 * Explicit local adapter used until the Python inventory endpoint is connected.
 * The source label travels with the data so the UI can identify demo records.
 */
export async function getInventoryDataset(): Promise<InventoryDataset> {
  return {
    items: demoInventory.map((item) => ({ ...item })),
    source: "demo",
  };
}
