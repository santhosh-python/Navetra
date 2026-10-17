import { describe, expect, it } from "vitest";
import { calculateUsageVariability } from "../src/lib/analytics";

describe("calculateUsageVariability", () => {
  it("expresses each daily observation relative to the selected-period mean", () => {
    const series = calculateUsageVariability([
      { date: "2026-10-01", consumption: 8 },
      { date: "2026-10-02", consumption: 10 },
      { date: "2026-10-03", consumption: 12 },
    ]);

    expect(series.map(({ deviationPercent }) => deviationPercent)).toEqual([-20, 0, 20]);
    expect(series.map(({ consumption }) => consumption)).toEqual([8, 10, 12]);
  });

  it("returns an empty series when no observations are available", () => {
    expect(calculateUsageVariability([])).toEqual([]);
  });

  it("uses zero deviation when the selected-period mean is zero", () => {
    const series = calculateUsageVariability([
      { date: "2026-10-01", consumption: 0 },
      { date: "2026-10-02", consumption: 0 },
    ]);

    expect(series.map(({ deviationPercent }) => deviationPercent)).toEqual([0, 0]);
  });

  it("rejects invalid consumption values", () => {
    expect(() => calculateUsageVariability([{ date: "2026-10-01", consumption: -1 }])).toThrow(RangeError);
    expect(() => calculateUsageVariability([{ date: "2026-10-01", consumption: Number.NaN }])).toThrow(RangeError);
  });
});
