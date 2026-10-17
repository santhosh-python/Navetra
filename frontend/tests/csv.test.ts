import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseInventoryCsv } from "../src/lib/csv";

const sampleCsv = readFileSync(
  new URL("../public/sample-data/inventory-sample.csv", import.meta.url),
  "utf8",
);

const validHeader =
  "id,sku,name,category,location,unit,currentStock,averageDailyUsage,minimumStock,safetyStock,supplierName,leadTimeDays,expectedDeliveryDate,incomingQuantity,unitCost,criticality";
const validRow =
  "item-1,SKU-1,Gloves,PPE,Hyderabad,boxes,20,4,8,3,Supplier,5,2026-10-25,10,120,high";

function makeCsv(...rows: string[]) {
  return [validHeader, ...rows].join("\n");
}

describe("inventory CSV validation", () => {
  it("parses the checked-in sample CSV, including quoted fields", () => {
    const preview = parseInventoryCsv(sampleCsv);

    expect(preview.isValid).toBe(true);
    expect(preview.rows).toHaveLength(18);
    expect(preview.rows[0]?.sku).toBe("MED-ORS-001");
    expect(preview.rows[1]?.name).toBe("Examination gloves, medium");
  });

  it("parses a valid row and permits an empty optional delivery date", () => {
    const preview = parseInventoryCsv(makeCsv(validRow.replace("2026-10-25", "")));

    expect(preview.isValid).toBe(true);
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0]?.leadTimeDays).toBe(5);
    expect(preview.rows[0]?.expectedDeliveryDate).toBeNull();
  });

  it("reports missing required columns before parsing records", () => {
    const preview = parseInventoryCsv("id,sku,name\nitem-1,SKU-1,Gloves");

    expect(preview.isValid).toBe(false);
    expect(preview.rows).toHaveLength(0);
    expect(preview.issues[0]?.message).toContain("Missing required columns");
  });

  it("reports invalid numbers and calendar dates with row and column details", () => {
    const invalidRow = validRow
      .replace(",20,4,8,3,", ",-2,not-a-number,8,3,")
      .replace("2026-10-25", "2026-02-30");
    const preview = parseInventoryCsv(makeCsv(invalidRow));

    expect(preview.isValid).toBe(false);
    expect(preview.rows).toHaveLength(0);
    expect(preview.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowNumber: 2, column: "currentStock" }),
        expect.objectContaining({ rowNumber: 2, column: "averageDailyUsage" }),
        expect.objectContaining({ rowNumber: 2, column: "expectedDeliveryDate" }),
      ]),
    );
  });

  it("keeps valid preview rows while identifying an invalid row", () => {
    const invalidRow = validRow.replace(",20,4,8,3,", ",-1,4,8,3,");
    const preview = parseInventoryCsv(makeCsv(validRow, invalidRow));

    expect(preview.isValid).toBe(false);
    expect(preview.rowCount).toBe(2);
    expect(preview.rows).toHaveLength(1);
    expect(preview.issues.some((issue) => issue.rowNumber === 3)).toBe(true);
  });
});
