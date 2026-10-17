import type { ReactNode } from 'react';
import { SettingsProvider } from '../state/SettingsContext';
import { InventoryProvider } from '../state/InventoryContext';
import { NotificationProvider } from '../state/NotificationContext';
import { ActivityProvider } from '../state/ActivityContext';
import { SimulatorProvider } from '../state/SimulatorContext';

/**
 * Application-wide state. Order matters: notifications and inventory depend on settings.
 * Add new providers here, never inside pages.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <InventoryProvider>
        <ActivityProvider>
          <NotificationProvider>
            <SimulatorProvider>{children}</SimulatorProvider>
          </NotificationProvider>
        </ActivityProvider>
      </InventoryProvider>
    </SettingsProvider>
  );
}
