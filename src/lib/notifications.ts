/**
 * Notification rules. Notifications are derived from the current analysis, so they always match the
 * numbers on the pages. Read/dismissed state is kept separately in the NotificationContext.
 */
import type { InventoryItem, RiskLevel } from '../types/inventory';
import type { InventoryRow } from './inventoryQuery';
import { diffDays } from './dates';
import { STOCK_COUNT_MAX_AGE_DAYS } from './recommendations';

export type NotificationKind = 'stock-out-before-delivery' | 'critical-level' | 'warning-level' | 'stock-count-overdue';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  severity: RiskLevel | 'info';
  title: string;
  message: string;
  itemId: string;
}

export interface NotificationPreferences {
  notifyCriticalShortages: boolean;
  notifyWarnings: boolean;
  notifyMissingCounts: boolean;
}

export function buildNotifications(
  rows: InventoryRow[],
  preferences: NotificationPreferences,
  asOfDate: string,
): AppNotification[] {
  const notifications: AppNotification[] = [];
  for (const { item, analysis } of rows) {
    if (analysis.risk === 'critical' && preferences.notifyCriticalShortages) {
      notifications.push(buildCriticalNotification(item, analysis.gapDays));
    }
    if (analysis.risk === 'warning' && preferences.notifyWarnings) {
      notifications.push({
        id: `warning-level-${item.id}`,
        kind: 'warning-level',
        severity: 'warning',
        title: `${item.name} is at warning level`,
        message: analysis.daysOfStock === null
          ? 'Stock is below the minimum level.'
          : `Stock lasts about ${Math.floor(analysis.daysOfStock)} days at the current rate.`,
        itemId: item.id,
      });
    }
    if (preferences.notifyMissingCounts && diffDays(item.lastCountDate, asOfDate) > STOCK_COUNT_MAX_AGE_DAYS) {
      notifications.push({
        id: `stock-count-overdue-${item.id}`,
        kind: 'stock-count-overdue',
        severity: 'info',
        title: `Stock count overdue: ${item.name}`,
        message: `Last counted ${diffDays(item.lastCountDate, asOfDate)} days ago. Confirm the recorded stock.`,
        itemId: item.id,
      });
    }
  }
  return notifications;
}

function buildCriticalNotification(item: InventoryItem, gapDays: number): AppNotification {
  if (gapDays > 0) {
    return {
      id: `stock-out-before-delivery-${item.id}`,
      kind: 'stock-out-before-delivery',
      severity: 'critical',
      title: `Shortage expected before delivery: ${item.name}`,
      message: `Stock is projected to run out ${gapDays} day${gapDays === 1 ? '' : 's'} before replenishment.`,
      itemId: item.id,
    };
  }
  return {
    id: `critical-level-${item.id}`,
    kind: 'critical-level',
    severity: 'critical',
    title: `Critical stock level: ${item.name}`,
    message: 'Stock is within the critical threshold.',
    itemId: item.id,
  };
}
