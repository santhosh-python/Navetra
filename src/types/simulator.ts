/** Controls for one what-if scenario. All values are in the item's own unit and calendar days. */
export interface ScenarioSettings {
  itemId: string;
  /** Change in daily demand, from -50 to +100 (percent). */
  demandChangePercent: number;
  /** Additional demand reduction (e.g. rationing), from 0 to 50 (percent). */
  demandReductionPercent: number;
  /** Extra days added to the scheduled or expected replenishment, from 0 to 14. */
  deliveryDelayDays: number;
  /** Extra order placed for this scenario, in the item's unit. */
  additionalOrderQuantity: number;
  /** Days from today when the extra order arrives. */
  additionalOrderArrivalDay: number;
  /** Stock transferred from another location, arriving tomorrow. */
  transferQuantity: number;
  /** Safety-stock level the scenario aims to keep, in the item's unit. */
  safetyStockTarget: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  savedAt: string;
  settings: ScenarioSettings;
}
