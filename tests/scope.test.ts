import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { buildInventoryRows, countByRisk, summariseRisk } from '../src/lib/portfolio';
import { filterRowsByScope } from '../src/lib/inventoryQuery';

const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, { criticalDays: 7, warningDays: 14 }, 30);
const ALL = { location: 'all', category: 'all' };

describe('overview scope', () => {
  it('returns every row when no restriction is set', () => {
    expect(filterRowsByScope(rows, ALL)).toHaveLength(DEMO_ITEMS.length);
  });

  it('restricts by location and category together', () => {
    const location = DEMO_ITEMS[0].location;
    const category = DEMO_ITEMS[0].category;
    const scoped = filterRowsByScope(rows, { location, category });
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every(({ item }) => item.location === location && item.category === category)).toBe(true);
  });

  it('keeps summaries consistent with the scoped rows', () => {
    for (const location of [...new Set(DEMO_ITEMS.map((item) => item.location))]) {
      const scoped = filterRowsByScope(rows, { location, category: 'all' });
      const summary = summariseRisk(scoped);
      expect(summary.total).toBe(scoped.length);
      expect(summary.critical + summary.warning + summary.safe).toBe(scoped.length);
      expect(countByRisk(scoped)).toEqual({ critical: summary.critical, warning: summary.warning, safe: summary.safe });
    }
  });

  it('returns nothing for a location that has no items', () => {
    expect(filterRowsByScope(rows, { location: 'No such location', category: 'all' })).toEqual([]);
  });
});
