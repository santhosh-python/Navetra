import { describe, expect, it } from 'vitest';
import {
  calculateDaysOfStock,
  calculateEmergencyOrderQuantity,
  calculatePolicyReorderQuantity,
  calculateReorderPoint,
  calculateShortageGapDays,
  calculateShortageQuantity,
  calculateStockOutDate,
  calculateReplenishmentDate,
  calculateInventoryTurnover,
  calculateCoefficientOfVariationPercent,
} from '../src/lib/calculations';
import { addDays, diffDays, isValidIsoDate, DEMO_AS_OF_DATE } from '../src/lib/dates';
import { classifyRisk } from '../src/lib/riskClassification';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };

describe('days of stock', () => {
  it('divides current stock by daily usage', () => {
    expect(calculateDaysOfStock(120, 18)).toBeCloseTo(6.6667, 3);
  });
  it('returns null when there is no usage', () => {
    expect(calculateDaysOfStock(50, 0)).toBeNull();
  });
  it('never returns a negative value', () => {
    expect(calculateDaysOfStock(-5, 2)).toBe(0);
  });
});

describe('projected stock-out date', () => {
  it('is the as-of date plus whole days of stock', () => {
    expect(calculateStockOutDate(DEMO_AS_OF_DATE, 6.67)).toBe('2026-10-23');
  });
  it('is null when usage is zero', () => {
    expect(calculateStockOutDate(DEMO_AS_OF_DATE, null)).toBeNull();
  });
  it('crosses month boundaries correctly', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });
});

describe('replenishment timing', () => {
  it('uses the scheduled delivery when one exists', () => {
    expect(calculateReplenishmentDate(DEMO_AS_OF_DATE, '2026-10-26', 5)).toBe('2026-10-26');
  });
  it('falls back to one lead time from today when nothing is scheduled', () => {
    expect(calculateReplenishmentDate(DEMO_AS_OF_DATE, null, 8)).toBe('2026-10-25');
  });
  it('gap is the days between stock-out and replenishment', () => {
    expect(calculateShortageGapDays('2026-10-23', '2026-10-26')).toBe(3);
  });
  it('gap is zero when stock lasts until replenishment', () => {
    expect(calculateShortageGapDays('2026-10-30', '2026-10-26')).toBe(0);
  });
  it('gap is zero when there is no stock-out', () => {
    expect(calculateShortageGapDays(null, '2026-10-26')).toBe(0);
  });
});

describe('shortage quantity', () => {
  it('equals demand until replenishment minus stock on hand', () => {
    // 18 per day for 9 days = 162 needed, 120 on hand => 42 short
    expect(calculateShortageQuantity(120, 18, 9)).toBe(42);
  });
  it('is zero when stock covers the wait', () => {
    expect(calculateShortageQuantity(500, 18, 9)).toBe(0);
  });
});

describe('reorder point and quantity', () => {
  it('reorder point is lead-time demand plus safety stock', () => {
    expect(calculateReorderPoint(18, 5, 60)).toBe(150);
  });
  it('policy quantity is zero while inventory position is above the reorder point', () => {
    expect(
      calculatePolicyReorderQuantity({
        dailyUsage: 18,
        leadTimeDays: 5,
        safetyStock: 60,
        currentStock: 120,
        incomingQuantity: 500,
        targetCoverDays: 30,
      }),
    ).toBe(0);
  });
  it('policy quantity refills to lead time + target cover + safety stock', () => {
    // position 240 < reorder point 276 (22*8+100). Order-up-to = 22*(8+30)+100 = 936. Order = 936-240 = 696.
    expect(
      calculatePolicyReorderQuantity({
        dailyUsage: 22,
        leadTimeDays: 8,
        safetyStock: 100,
        currentStock: 240,
        incomingQuantity: 0,
        targetCoverDays: 30,
      }),
    ).toBe(696);
  });
  it('emergency quantity covers the shortage plus the safety target', () => {
    expect(calculateEmergencyOrderQuantity(42, 60)).toBe(102);
    expect(calculateEmergencyOrderQuantity(0, 60)).toBe(0);
  });
});

describe('risk classification', () => {
  it('is critical when stock runs out before replenishment', () => {
    expect(classifyRisk({ daysOfStock: 6.67, gapDays: 3, currentStock: 120, minimumStock: 150 }, THRESHOLDS)).toBe('critical');
  });
  it('is critical at or below the critical threshold even with no gap', () => {
    expect(classifyRisk({ daysOfStock: 7, gapDays: 0, currentStock: 100, minimumStock: 10 }, THRESHOLDS)).toBe('critical');
  });
  it('is warning between the thresholds', () => {
    expect(classifyRisk({ daysOfStock: 12, gapDays: 0, currentStock: 100, minimumStock: 10 }, THRESHOLDS)).toBe('warning');
  });
  it('is warning when below minimum stock even if cover is long', () => {
    expect(classifyRisk({ daysOfStock: 30, gapDays: 0, currentStock: 6, minimumStock: 10 }, THRESHOLDS)).toBe('warning');
  });
  it('is safe otherwise', () => {
    expect(classifyRisk({ daysOfStock: 30, gapDays: 0, currentStock: 300, minimumStock: 10 }, THRESHOLDS)).toBe('safe');
  });
  it('uses the thresholds passed in (settings can change them)', () => {
    expect(classifyRisk({ daysOfStock: 12, gapDays: 0, currentStock: 100, minimumStock: 10 }, { criticalDays: 14, warningDays: 20 })).toBe('critical');
  });
});

describe('analytics formulas', () => {
  it('turnover is annual usage divided by stock', () => {
    expect(calculateInventoryTurnover(2, 73)).toBeCloseTo(10, 1);
  });
  it('turnover is null without usage or stock', () => {
    expect(calculateInventoryTurnover(0, 10)).toBeNull();
    expect(calculateInventoryTurnover(2, 0)).toBeNull();
  });
  it('coefficient of variation is zero for constant demand', () => {
    expect(calculateCoefficientOfVariationPercent([5, 5, 5])).toBe(0);
  });
});

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('17/10/2026')).toBe(false);
  });
  it('counts whole days between dates', () => {
    expect(diffDays('2026-10-17', '2026-10-26')).toBe(9);
    expect(diffDays('2026-10-26', '2026-10-17')).toBe(-9);
  });
});
