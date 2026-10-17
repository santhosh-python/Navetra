import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../src/data/defaultSettings";
import { demoInventory } from "../src/data/demoInventory";
import { simulateInventoryScenario } from "../src/lib/simulator";

describe("inventory scenario simulator", () => {
  const item = demoInventory.find((record) => record.sku === "MED-ORS-001")!;
  const baselineControls = {
    demandChangePercent: 0,
    deliveryDelayDays: 0,
    additionalOrderQuantity: 0,
    safetyStock: item.safetyStock,
  };

  it("uses the shared snapshot and compares baseline with the selected scenario", () => {
    const projection = simulateInventoryScenario(item, baselineControls, DEFAULT_SETTINGS.riskThresholds, 14);

    expect(projection.points).toHaveLength(15);
    expect(projection.points[0]?.date).toBe("2026-10-17");
    expect(projection.baselineStockOutDate?.toISOString().slice(0, 10)).toBe("2026-10-21");
    expect(projection.simulatedStockOutDate?.toISOString().slice(0, 10)).toBe("2026-10-21");
    expect(projection.baselineGapDays).toBe(projection.simulatedGapDays);
  });

  it("shows a delayed delivery increasing the supply gap", () => {
    const projection = simulateInventoryScenario(item, { ...baselineControls, deliveryDelayDays: 3 }, DEFAULT_SETTINGS.riskThresholds, 14);

    expect(projection.simulatedGapDays).toBeGreaterThan(projection.baselineGapDays);
    expect(projection.adjustedDeliveryDate.toISOString().slice(0, 10)).toBe("2026-10-29");
  });

  it("adds proposed order quantity to the inbound shipment and lowers the reorder estimate", () => {
    const baseline = simulateInventoryScenario(item, baselineControls, DEFAULT_SETTINGS.riskThresholds, 14);
    const withAdditionalOrder = simulateInventoryScenario(item, { ...baselineControls, additionalOrderQuantity: 50 }, DEFAULT_SETTINGS.riskThresholds, 14);
    const dayOfDelivery = 9;

    expect(withAdditionalOrder.points[dayOfDelivery]?.simulatedStock).toBe((baseline.points[dayOfDelivery]?.simulatedStock ?? 0) + 50);
    expect(withAdditionalOrder.simulatedReorderQuantity).toBeLessThan(baseline.simulatedReorderQuantity);
  });

  it("rejects invalid scenario parameters", () => {
    expect(() => simulateInventoryScenario(item, { ...baselineControls, deliveryDelayDays: 15 }, DEFAULT_SETTINGS.riskThresholds, 14)).toThrow("Delivery delay");
    expect(() => simulateInventoryScenario(item, { ...baselineControls, demandChangePercent: Number.NaN }, DEFAULT_SETTINGS.riskThresholds, 14)).toThrow("Demand change");
  });
});
