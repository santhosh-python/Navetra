import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS, findDemoItemById } from '../src/data/demoInventory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { createDefaultScenario, simulateScenario, SCENARIO_PRESETS } from '../src/lib/scenarios';
import { projectStockDepletion, summariseProjection } from '../src/lib/forecasting';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const ors = findDemoItemById('MED-ORS-001')!;

describe('what-if scenarios', () => {
  it('with no changes, the simulated result equals the baseline', () => {
    const result = simulateScenario(ors, createDefaultScenario(ors), DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.simulated.summary).toEqual(result.baseline.summary);
    expect(result.riskDirection).toBe('unchanged');
  });

  it('a 20% demand increase brings the stock-out forward', () => {
    const result = simulateScenario(ors, { ...createDefaultScenario(ors), demandChangePercent: 20 }, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.simulated.summary.stockOutDate! < result.baseline.summary.stockOutDate!).toBe(true);
    expect(result.simulated.summary.gapDays).toBeGreaterThanOrEqual(result.baseline.summary.gapDays);
  });

  it('a 3-day delivery delay increases the gap by 3 days when stock-out is unchanged', () => {
    const result = simulateScenario(ors, { ...createDefaultScenario(ors), deliveryDelayDays: 3 }, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.simulated.summary.replenishmentDate).toBe('2026-10-29');
    expect(result.simulated.summary.gapDays).toBe(result.baseline.summary.gapDays + 3);
  });

  it('an early emergency order reduces the shortage before replenishment', () => {
    const preset = SCENARIO_PRESETS.find((candidate) => candidate.id === 'emergency-order-early')!;
    const settings = preset.apply(ors, createDefaultScenario(ors));
    const result = simulateScenario(ors, settings, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.simulated.shortageBeforeReplenishment).toBeLessThan(result.baseline.shortageBeforeReplenishment);
    expect(result.simulated.summary.gapDays).toBeLessThan(result.baseline.summary.gapDays);
    // Stock on hand still lasts under 7 days, so the risk label can stay Critical; the explanation must say what improved.
    expect(result.points.join(' ')).toMatch(/shortage window|Units short/);
  });

  it('a transfer that covers the gap improves the risk', () => {
    const result = simulateScenario(ors, { ...createDefaultScenario(ors), transferQuantity: 60 }, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.simulated.shortageBeforeReplenishment).toBe(0);
  });

  it('keeps the explanation consistent with the numbers', () => {
    const result = simulateScenario(ors, { ...createDefaultScenario(ors), deliveryDelayDays: 3 }, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.points.join(' ')).toContain('+3 days');
    expect(result.headline).toMatch(/Risk (worsens|improves|stays)/);
  });

  it('clamps out-of-range controls to the allowed limits', () => {
    const result = simulateScenario(ors, { ...createDefaultScenario(ors), demandChangePercent: 500, deliveryDelayDays: 99 }, DEMO_AS_OF_DATE, THRESHOLDS, 30, 30);
    expect(result.settings.demandChangePercent).toBe(100);
    expect(result.settings.deliveryDelayDays).toBe(14);
  });

  it('runs for every demo item without errors', () => {
    for (const item of DEMO_ITEMS) {
      expect(() => simulateScenario(item, createDefaultScenario(item), DEMO_AS_OF_DATE, THRESHOLDS, 60, 30)).not.toThrow();
    }
  });
});

describe('projection engine', () => {
  it('reproduces the simple formula: stock 120, usage 18, no arrivals -> first shortage on day 6', () => {
    const projection = projectStockDepletion({ asOfDate: DEMO_AS_OF_DATE, startingStock: 120, dailyUsage: 18, horizonDays: 10, arrivals: [] });
    const summary = summariseProjection(projection, 9, 120);
    expect(summary.firstShortageDayIndex).toBe(6);
    expect(summary.shortageBeforeReplenishment).toBe(42);
  });

  it('never reports negative stock', () => {
    const projection = projectStockDepletion({ asOfDate: DEMO_AS_OF_DATE, startingStock: 10, dailyUsage: 4, horizonDays: 10, arrivals: [] });
    expect(projection.every((point) => point.projectedStock >= 0)).toBe(true);
  });
});
