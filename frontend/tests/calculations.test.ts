import { describe, expect, it } from "vitest";
import {
  calculateDaysOfStock,
  calculateProjectedStockOutDate,
  calculateReorderQuantity,
  calculateReplenishmentTiming,
  calculateWhatIfScenario,
  classifyInventoryRisk,
} from "../src/lib/calculations";
import { demoInventory } from "../src/data/demoInventory";

describe("inventory calculations", () => {
  it("calculates fractional days of stock and handles zero usage", () => {
    expect(calculateDaysOfStock({ currentStock: 145, averageDailyUsage: 14 })).toBeCloseTo(145 / 14);
    expect(calculateDaysOfStock({ currentStock: 20, averageDailyUsage: 0 })).toBeNull();
  });

  it("projects a stock-out date without mutating the input date", () => {
    const asOfDate = new Date(Date.UTC(2026, 9, 17));
    const projectedDate = calculateProjectedStockOutDate({ currentStock: 10, averageDailyUsage: 3 }, asOfDate);

    expect(projectedDate?.toISOString().slice(0, 10)).toBe("2026-10-21");
    expect(asOfDate.toISOString().slice(0, 10)).toBe("2026-10-17");
    expect(calculateProjectedStockOutDate({ currentStock: 10, averageDailyUsage: 0 }, asOfDate)).toBeNull();
  });

  it("classifies lead-time replenishment timing", () => {
    expect(calculateReplenishmentTiming(4, 5)).toBe("order-now");
    expect(calculateReplenishmentTiming(10, 5)).toBe("monitor");
    expect(calculateReplenishmentTiming(13, 5)).toBe("plan-ahead");
    expect(calculateReplenishmentTiming(null, 5)).toBe("not-applicable");
  });

  it("classifies risk from stock coverage, minimum levels, and configurable buffers", () => {
    const oralRehydrationSalts = demoInventory.find((item) => item.sku === "MED-ORS-001")!;
    expect(classifyInventoryRisk(oralRehydrationSalts)).toBe("critical");
    expect(classifyInventoryRisk({ ...oralRehydrationSalts, currentStock: 0 })).toBe("critical");
    expect(classifyInventoryRisk({ ...oralRehydrationSalts, currentStock: 1_000, averageDailyUsage: 10 })).toBe("low");
    expect(() => classifyInventoryRisk(oralRehydrationSalts, { criticalBufferDays: 4, warningBufferDays: 2, safeBufferDays: 7 })).toThrow("Risk buffers must be ordered");
  });

  it("includes lead-time demand and incoming stock in reorder quantity", () => {
    expect(calculateReorderQuantity({ currentStock: 100, averageDailyUsage: 10, minimumStock: 50, safetyStock: 20, leadTimeDays: 5, incomingQuantity: 10 })).toBe(10);
    expect(calculateReorderQuantity({ currentStock: 1_000, averageDailyUsage: 10, minimumStock: 50, safetyStock: 20, leadTimeDays: 5, incomingQuantity: 10 })).toBe(0);
  });

  it("calculates a what-if usage change", () => {
    const result = calculateWhatIfScenario({ currentStock: 100, averageDailyUsage: 4 }, 50, new Date(Date.UTC(2026, 9, 17)));
    expect(result.adjustedAverageDailyUsage).toBe(6);
    expect(result.daysOfStock).toBeCloseTo(100 / 6);
    expect(result.projectedStockOutDate?.toISOString().slice(0, 10)).toBe("2026-11-03");
  });
});
