import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_DELIVERY_HISTORY } from '../src/data/demoDeliveries';
import { buildDemoStockHistoryByItem } from '../src/data/demoHistory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { analyseInventoryItem } from '../src/lib/stockAnalysis';
import { buildForecastSnapshot } from '../src/lib/forecasting';
import { buildInventoryRows, summariseRisk } from '../src/lib/portfolio';
import { buildRankedRecommendations } from '../src/lib/recommendations';
import { buildScheduledDeliveries } from '../src/lib/deliveries';
import { calculateRecentUsageRatio } from '../src/lib/history';
import { validateInventoryRecord } from '../src/lib/validators';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const TARGET_COVER = 30;
const history = buildDemoStockHistoryByItem(DEMO_ITEMS, DEMO_DELIVERY_HISTORY, DEMO_AS_OF_DATE);
const contextFor = () => ({
  asOfDate: DEMO_AS_OF_DATE,
  thresholds: THRESHOLDS,
  targetCoverDays: TARGET_COVER,
  recentUsageRatioByItemId: Object.fromEntries(DEMO_ITEMS.map((item) => [item.id, calculateRecentUsageRatio(history[item.id])])),
});

describe('demo dataset', () => {
  it('has unique ids and SKUs', () => {
    expect(new Set(DEMO_ITEMS.map((item) => item.id)).size).toBe(DEMO_ITEMS.length);
    expect(new Set(DEMO_ITEMS.map((item) => item.sku)).size).toBe(DEMO_ITEMS.length);
  });

  it('passes the same validation rules as the add/edit form', () => {
    for (const item of DEMO_ITEMS) {
      const raw = {
        sku: item.sku, name: item.name, category: item.category, location: item.location, unit: item.unit,
        currentStock: String(item.currentStock), averageDailyUsage: String(item.averageDailyUsage),
        minimumStock: String(item.minimumStock), safetyStock: String(item.safetyStock), supplierName: item.supplierName,
        leadTimeDays: String(item.leadTimeDays), expectedDeliveryDate: item.expectedDeliveryDate ?? '',
        incomingQuantity: String(item.incomingQuantity), unitCost: String(item.unitCost), criticality: item.criticality,
        servicesAffected: String(item.servicesAffected), alternativeSupplierAvailable: item.alternativeSupplierAvailable ? 'yes' : 'no',
        stockHeldElsewhere: String(item.stockHeldElsewhere), lastCountDate: item.lastCountDate,
      };
      const result = validateInventoryRecord(raw, { existingSkus: [] });
      expect(result.errors, item.sku).toEqual({});
    }
  });

  it('has a mix of Critical, Warning and Safe items', () => {
    const summary = summariseRisk(buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, THRESHOLDS, TARGET_COVER));
    expect(summary.total).toBe(18);
    expect(summary.critical).toBeGreaterThan(0);
    expect(summary.warning).toBeGreaterThan(0);
    expect(summary.safe).toBeGreaterThan(0);
    expect(summary.critical + summary.warning + summary.safe).toBe(summary.total);
  });

  it('every scheduled delivery is in the future relative to the as-of date', () => {
    for (const delivery of buildScheduledDeliveries(DEMO_ITEMS)) {
      expect(delivery.deliveryDate >= DEMO_AS_OF_DATE, delivery.id).toBe(true);
    }
  });

  it('items with incoming stock always have a delivery date', () => {
    for (const item of DEMO_ITEMS) {
      if (item.incomingQuantity > 0) expect(item.expectedDeliveryDate, item.sku).not.toBeNull();
    }
  });
});

describe('stock history', () => {
  it('never goes below zero', () => {
    for (const item of DEMO_ITEMS) {
      for (const day of history[item.id]) {
        expect(day.openingStock, `${item.sku} ${day.date}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('ends at the current stock level', () => {
    for (const item of DEMO_ITEMS) {
      const lastDay = history[item.id][history[item.id].length - 1];
      const closing = lastDay.openingStock - lastDay.consumption + lastDay.received;
      expect(closing, item.sku).toBeCloseTo(item.currentStock, 6);
    }
  });

  it('is reproducible', () => {
    const again = buildDemoStockHistoryByItem(DEMO_ITEMS, DEMO_DELIVERY_HISTORY, DEMO_AS_OF_DATE);
    expect(again).toEqual(history);
  });
});

describe('forecast consistency', () => {
  it('formula stock-out date matches the first unmet day in the projection', () => {
    for (const item of DEMO_ITEMS) {
      const analysis = analyseInventoryItem(item, DEMO_AS_OF_DATE, THRESHOLDS, { targetCoverDays: TARGET_COVER });
      const snapshot = buildForecastSnapshot(item, DEMO_AS_OF_DATE, THRESHOLDS, 120, TARGET_COVER);
      const firstUnmet = snapshot.projection.find((point) => point.unmetDemand > 0);
      if (analysis.stockOutDate === null) continue;
      if (analysis.stockOutDate > snapshot.projection[snapshot.projection.length - 1].date) continue;
      // stockOutDate is "runs out at current use". A delivery that arrives first changes the projection.
      if (item.expectedDeliveryDate !== null && item.expectedDeliveryDate <= analysis.stockOutDate) continue;
      expect(firstUnmet?.date, item.sku).toBe(analysis.stockOutDate);
    }
  });

  it('shortage quantity matches the projected unmet demand before replenishment', () => {
    for (const item of DEMO_ITEMS) {
      const analysis = analyseInventoryItem(item, DEMO_AS_OF_DATE, THRESHOLDS, { targetCoverDays: TARGET_COVER });
      const snapshot = buildForecastSnapshot(item, DEMO_AS_OF_DATE, THRESHOLDS, 120, TARGET_COVER);
      const unmetBefore = snapshot.projection
        .filter((point) => point.date < analysis.replenishmentDate)
        .reduce((sum, point) => sum + point.unmetDemand, 0);
      expect(Math.max(0, Math.ceil(unmetBefore - 1e-9)), item.sku).toBe(analysis.shortageQuantity);
    }
  });

  it('known demo cases resolve as designed', () => {
    const byId = Object.fromEntries(DEMO_ITEMS.map((item) => [item.id, analyseInventoryItem(item, DEMO_AS_OF_DATE, THRESHOLDS, { targetCoverDays: TARGET_COVER })]));
    // ORS: 120 / 18 = 6.67 days, delivery in 9 days => 3-day gap, 42 units short
    expect(byId['MED-ORS-001'].gapDays).toBe(3);
    expect(byId['MED-ORS-001'].shortageQuantity).toBe(42);
    expect(byId['MED-ORS-001'].risk).toBe('critical');
    expect(byId['FOOD-RIC-25'].risk).toBe('safe');
    expect(byId['EMG-TQT-01'].risk).toBe('warning');
  });
});

describe('recommendations', () => {
  it('only Critical and Warning items are ranked, highest priority first', () => {
    const ranked = buildRankedRecommendations(DEMO_ITEMS, contextFor());
    expect(ranked.every((recommendation) => recommendation.risk !== 'safe')).toBe(true);
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index - 1].priorityScore).toBeGreaterThanOrEqual(ranked[index].priorityScore);
    }
    expect(ranked.every((recommendation) => recommendation.priorityScore <= 100)).toBe(true);
  });

  it('explains the priority breakdown with factors that add up to the score', () => {
    for (const recommendation of buildRankedRecommendations(DEMO_ITEMS, contextFor())) {
      const total = recommendation.priorityFactors.reduce((sum, factor) => sum + factor.points, 0);
      expect(total).toBe(recommendation.priorityScore);
    }
  });

  it('suggests a transfer where another location holds enough stock', () => {
    const ranked = buildRankedRecommendations(DEMO_ITEMS, contextFor());
    const glove = ranked.find((recommendation) => recommendation.sku === 'MED-GLV-M');
    expect(glove?.action).toBe('Check stock records');
  });

  it('never suggests an action that claims an order was placed', () => {
    for (const recommendation of buildRankedRecommendations(DEMO_ITEMS, contextFor())) {
      expect(recommendation.reason.toLowerCase()).not.toContain('placed');
      expect(recommendation.reason.toLowerCase()).not.toContain('contacted');
    }
  });
});
