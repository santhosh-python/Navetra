import type { DateOnly } from "../types/inventory";
import { DEMO_AS_OF_DATE, demoInventory } from "./demoInventory";

export interface DailyUsageObservation {
  inventoryItemId: string;
  date: DateOnly;
  consumption: number;
  closingStock: number;
  source: "synthetic-demo";
}

function toDateOnly(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/** Deterministic 30-day history generated from shared demo item values. */
export const demoHistory: readonly DailyUsageObservation[] = demoInventory.flatMap(
  (item, itemIndex) => {
    let closingStock = item.currentStock;
    const observations: DailyUsageObservation[] = [];

    for (let daysAgo = 1; daysAgo <= 30; daysAgo += 1) {
      const variation = 0.84 + ((itemIndex * 5 + daysAgo * 3) % 13) / 40;
      const consumption = Math.max(0.1, Math.round(item.averageDailyUsage * variation * 10) / 10);
      closingStock += consumption;
      const date = new Date(DEMO_AS_OF_DATE.getTime());
      date.setUTCDate(date.getUTCDate() - daysAgo);
      observations.push({
        inventoryItemId: item.id,
        date: toDateOnly(date),
        consumption,
        closingStock: Math.round(closingStock * 10) / 10,
        source: "synthetic-demo",
      });
    }

    return observations.reverse();
  },
);
