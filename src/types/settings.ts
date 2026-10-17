/**
 * User preferences. Fields marked "frontend" change calculations or views in this browser.
 * Organisation details are stored in this browser only until the backend exists.
 */
export type DensityPreference = 'comfortable' | 'compact';

export interface AppSettings {
  // Organisation (stored in this browser only; server persistence is planned)
  organizationName: string;
  organizationContactEmail: string;

  // Risk thresholds (frontend: used by every risk calculation)
  /** Stock lasting this many days or fewer is Critical. */
  criticalDaysThreshold: number;
  /** Stock lasting this many days or fewer is Warning. */
  warningDaysThreshold: number;

  // Reorder policy (frontend)
  /** Days of demand to cover beyond lead time when suggesting an order. */
  targetCoverDays: number;
  /** Default safety stock, in days of demand, used to pre-fill new items. */
  defaultSafetyStockDays: number;
  /** Default supplier lead time used to pre-fill new items. */
  defaultLeadTimeDays: number;

  // Forecasting (frontend)
  /** Number of days shown in forecast projections. */
  forecastHorizonDays: number;

  // Lists (frontend)
  locations: string[];
  categories: string[];

  // Notifications (frontend)
  notifyCriticalShortages: boolean;
  notifyWarnings: boolean;
  notifyMissingCounts: boolean;

  // Display (frontend)
  density: DensityPreference;
  showDemoBanner: boolean;
}
