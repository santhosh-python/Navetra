import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import { buildNotifications, type AppNotification } from '../lib/notifications';
import { DEMO_AS_OF_DATE } from '../lib/dates';
import { createId } from '../lib/ids';
import { useInventory } from '../hooks/useInventory';
import { useSettings } from '../hooks/useSettings';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  message: string;
}

export interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  isRead: (notificationId: string) => boolean;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  dismiss: (notificationId: string) => void;
  toasts: Toast[];
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (toastId: string) => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { rows } = useInventory();
  const { settings } = useSettings();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notifications = useMemo(
    () =>
      buildNotifications(
        rows,
        {
          notifyCriticalShortages: settings.notifyCriticalShortages,
          notifyWarnings: settings.notifyWarnings,
          notifyMissingCounts: settings.notifyMissingCounts,
        },
        DEMO_AS_OF_DATE,
      ).filter((notification) => !dismissedIds.has(notification.id)),
    [rows, settings.notifyCriticalShortages, settings.notifyWarnings, settings.notifyMissingCounts, dismissedIds],
  );

  const unreadCount = notifications.filter((notification) => !readIds.has(notification.id)).length;

  const markRead = useCallback((notificationId: string) => {
    setReadIds((current) => new Set(current).add(notificationId));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((current) => new Set([...current, ...notifications.map((notification) => notification.id)]));
  }, [notifications]);

  const dismiss = useCallback((notificationId: string) => {
    setDismissedIds((current) => new Set(current).add(notificationId));
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = createId('toast');
      setToasts((current) => [...current, { id, tone, message }].slice(-4));
      window.setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast],
  );

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      isRead: (notificationId) => readIds.has(notificationId),
      markRead,
      markAllRead,
      dismiss,
      toasts,
      showToast,
      dismissToast,
    }),
    [notifications, unreadCount, readIds, markRead, markAllRead, dismiss, toasts, showToast, dismissToast],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
