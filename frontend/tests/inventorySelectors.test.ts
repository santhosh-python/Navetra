import { describe, expect, it } from "vitest";
import { demoInventory } from "../src/data/demoInventory";
import { selectInventory } from "../src/lib/inventorySelectors";

describe("inventory selection", () => {
  it("searches names, SKUs, categories, locations, and supplier names case-insensitively", () => {
    const expected = "MED-ORS-001";
    for (const searchText of ["oral rehydration", "med-ors-001", "essential medicines", "hyderabad central", "deccan medical supply"]) {
      const results = selectInventory(demoInventory, { searchText });
      expect(results.map((item) => item.sku)).toContain(expected);
    }
  });

  it("combines category and criticality filters", () => {
    const results = selectInventory(demoInventory, {
      category: "Emergency supplies",
      criticality: "critical",
    });

    expect(results.map((item) => item.sku)).toEqual(["EMR-OXY-MASK-017"]);
  });

  it("sorts numerically without mutating the shared demo source", () => {
    const originalOrder = demoInventory.map((item) => item.id);
    const results = selectInventory(demoInventory, {
      sortBy: "currentStock",
      sortDirection: "desc",
    });

    expect(results[0]?.currentStock).toBe(180);
    expect(results.at(-1)?.currentStock).toBe(9);
    expect(results.map((item) => item.currentStock)).toEqual([...results.map((item) => item.currentStock)].sort((left, right) => right - left));
    expect(demoInventory.map((item) => item.id)).toEqual(originalOrder);
  });
});
