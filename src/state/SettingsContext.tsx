import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppSettings } from '../types/settings';
import type { RiskThresholds } from '../lib/riskClassification';
import { DEMO_ORGANISATION } from '../data/demoInventory';
import { ITEM_CATEGORIES } from '../types/inventory';

export const SETTINGS_STORAGE_KEY = 'navetra.settings.v1';

export const DEFAULT_SETTINGS: AppSettings = {
  organizationName: DEMO_ORGANISATION.name,
  organizationContactEmail: DEMO_ORGANISATION.contactEmail,
  criticalDaysThreshold: 7,
  warningDaysThreshold: 14,
  targetCoverDays: 30,
  defaultSafetyStockDays: 3,
  defaultLeadTimeDays: 7,
  forecastHorizonDays: 30,
  locations: ['Central Store', 'Ward A Dispensary', 'Lab Annex', 'Emergency Bay', 'Hostel Kitchen'],
  categories: [...ITEM_CATEGORIES],
  notifyCriticalShortages: true,
  notifyWarnings: true,
  notifyMissingCounts: true,
  density: 'comfortable',
  showDemoBanner: true,
};

/** Reads saved preferences. Unknown or broken values fall back to the defaults. */
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<AppSettings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export interface SettingsContextValue {
  settings: AppSettings;
  riskThresholds: RiskThresholds;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage can be unavailable (private mode). Settings still work for this page session.
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  }, []);

  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const riskThresholds = useMemo<RiskThresholds>(
    () => ({ criticalDays: settings.criticalDaysThreshold, warningDays: settings.warningDaysThreshold }),
    [settings.criticalDaysThreshold, settings.warningDaysThreshold],
  );

  const value = useMemo(
    () => ({ settings, riskThresholds, updateSettings, resetSettings }),
    [settings, riskThresholds, updateSettings, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
