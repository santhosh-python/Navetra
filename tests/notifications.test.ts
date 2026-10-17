import { describe, expect, it } from 'vitest';
import { DEMO_ITEMS } from '../src/data/demoInventory';
import { DEMO_AS_OF_DATE } from '../src/lib/dates';
import { buildInventoryRows, countByRisk } from '../src/lib/portfolio';
import { buildNotifications, type NotificationPreferences } from '../src/lib/notifications';

const THRESHOLDS = { criticalDays: 7, warningDays: 14 };
const ALL_ON: NotificationPreferences = { notifyCriticalShortages: true, notifyWarnings: true, notifyMissingCounts: true };
const ALL_OFF: NotificationPreferences = { notifyCriticalShortages: false, notifyWarnings: false, notifyMissingCounts: false };
const rows = buildInventoryRows(DEMO_ITEMS, DEMO_AS_OF_DATE, THRESHOLDS, 30);

describe('notifications', () => {
  it('produces nothing when every preference is off', () => {
    expect(buildNotifications(rows, ALL_OFF, DEMO_AS_OF_DATE)).toEqual([]);
  });

  it('produces one critical notification per critical item when enabled', () => {
    const notices = buildNotifications(rows, { ...ALL_OFF, notifyCriticalShortages: true }, DEMO_AS_OF_DATE);
    expect(notices).toHaveLength(countByRisk(rows).critical);
    expect(notices.every((notice) => notice.severity === 'critical')).toBe(true);
  });

  it('produces warning notices only for warning-level items', () => {
    const notices = buildNotifications(rows, { ...ALL_OFF, notifyWarnings: true }, DEMO_AS_OF_DATE);
    expect(notices).toHaveLength(countByRisk(rows).warning);
    expect(notices.every((notice) => notice.severity === 'warning')).toBe(true);
  });

  it('flags a stock count older than 30 days as overdue, and not a recent one', () => {
    const [first, second] = DEMO_ITEMS;
    const stale = DEMO_ITEMS.map((item) => (item.id === first.id ? { ...item, lastCountDate: '2026-07-01' } : item.id === second.id ? { ...item, lastCountDate: '2026-10-15' } : item));
    const staleRows = buildInventoryRows(stale, DEMO_AS_OF_DATE, THRESHOLDS, 30);
    const notices = buildNotifications(staleRows, { ...ALL_OFF, notifyMissingCounts: true }, DEMO_AS_OF_DATE);
    const ids = notices.map((notice) => notice.itemId);
    expect(ids).toContain(first.id);
    expect(ids).not.toContain(second.id);
    const overdue = notices.find((notice) => notice.itemId === first.id);
    expect(overdue?.message).toMatch(/Last counted 108 days ago/);
  });

  it('gives every notification a unique id', () => {
    const notices = buildNotifications(rows, ALL_ON, DEMO_AS_OF_DATE);
    expect(new Set(notices.map((notice) => notice.id)).size).toBe(notices.length);
  });
});
