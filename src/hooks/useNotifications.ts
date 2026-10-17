import { useContext } from 'react';
import { NotificationContext, type NotificationContextValue } from '../state/NotificationContext';

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider.');
  return value;
}
