/**
 * What-if simulator engine. Runs the same projection as the forecast page, with scenario changes applied.
 * Scenario results are estimates from demo values. They are not operational outcomes.
 */
import type { InventoryItem, RiskLevel } from '../types/inventory';
import type { ScenarioSettings } from '../types/simulator';
import type { ProjectionPoint, ShortageSummary } from '../types/forecast';
import { addDays, diffDays, formatLongDate } from './dates';
import { formatDecimal, formatQuantity, formatSignedPercent, formatWholeDaysRemaining } from './formatters';
import {
  calculateDaysOfStock,
  calculateEmergencyOrderQuantity,
  calculatePolicyReorderQuantity,
  calculateReplenishmentDate,
  calculateShortageGapDays,
  calculateSuggestedOrderQuantity,
  calculateDaysUntilReplenishment,
} from './calculations';
import { classifyRisk, RISK_LABELS, type RiskThresholds, compareRiskLevels } from './riskClassification';
import { projectStockDepletion, summariseProjection, type ArrivalEvent } from './forecasting';

export const SCENARIO_LIMITS = {
  demandChangePercent: { min: -50, max: 100 },
  demandReductionPercent: { min: 0, max: 50 },
  deliveryDelayDays: { min: 0, max: 14 },
  transferArrivalDay: 1,
} as const;

export function createDefaultScenario(item: InventoryItem): ScenarioSettings {
  return {
    itemId: item.id,
    demandChangePercent: 0,
    demandReductionPercent: 0,
    deliveryDelayDays: 0,
    additionalOrderQuantity: 0,
    additionalOrderArrivalDay: 2,
    transferQuantity: 0,
    safetyStockTarget: item.safetyStock,
  };
}

export function clampScenario(settings: ScenarioSettings, horizonDays: number): ScenarioSettings {
  return {
    ...settings,
    demandChangePercent: clamp(settings.demandChangePercent, SCENARIO_LIMITS.demandChangePercent.min, SCENARIO_LIMITS.demandChangePercent.max),
    demandReductionPercent: clamp(settings.demandReductionPercent, SCENARIO_LIMITS.demandReductionPercent.min, SCENARIO_LIMITS.demandReductionPercent.max),
    deliveryDelayDays: clamp(settings.deliveryDelayDays, SCENARIO_LIMITS.deliveryDelayDays.min, SCENARIO_LIMITS.deliveryDelayDays.max),
    additionalOrderQuantity: Math.max(0, Math.round(settings.additionalOrderQuantity)),
    additionalOrderArrivalDay: clamp(Math.round(settings.additionalOrderArrivalDay), 0, Math.max(0, horizonDays - 1)),
    transferQuantity: Math.max(0, Math.round(settings.transferQuantity)),
    safetyStockTarget: Math.max(0, Math.round(settings.safetyStockTarget)),
  };
}

export interface ScenarioRun {
  summary: ShortageSummary;
  projection: ProjectionPoint[];
  dailyUsage: number;
  replenishmentDayIndex: number;
  /** Units short before replenishment. */
  shortageBeforeReplenishment: number;
  /** Units to order: the larger of the policy quantity and the emergency quantity. */
  requiredOrderQuantity: number;
  arrivals: ArrivalEvent[];
}

export interface ScenarioRunInput {
  asOfDate: string;
  onHandStock: number;
  /** Stock used for days-of-cover and risk: on-hand stock plus any transfer arriving tomorrow. */
  stockForDaysOfCover: number;
  dailyUsage: number;
  minimumStock: number;
  leadTimeDays: number;
  replenishmentDayIndex: number;
  arrivals: ArrivalEvent[];
  /** Units arriving at any time in the horizon (for the policy position). */
  inboundQuantity: number;
  safetyStockTarget: number;
  targetCoverDays: number;
  horizonDays: number;
  thresholds: RiskThresholds;
}

export function runScenario(input: ScenarioRunInput): ScenarioRun {
  const projection = projectStockDepletion({
    asOfDate: input.asOfDate,
    startingStock: input.onHandStock,
    dailyUsage: input.dailyUsage,
    horizonDays: input.horizonDays,
    arrivals: input.arrivals,
  });
  const projectionSummary = summariseProjection(projection, input.replenishmentDayIndex, input.onHandStock);
  const daysOfStock = calculateDaysOfStock(input.stockForDaysOfCover, input.dailyUsage);
  const stockOutDate =
    projectionSummary.firstShortageDayIndex === null ? null : addDays(input.asOfDate, projectionSummary.firstShortageDayIndex);
  const replenishmentDate = addDays(input.asOfDate, input.replenishmentDayIndex);
  const gapDays = calculateShortageGapDays(stockOutDate, replenishmentDate);
  const risk: RiskLevel = classifyRisk(
    { daysOfStock, gapDays, currentStock: input.stockForDaysOfCover, minimumStock: input.minimumStock },
    input.thresholds,
  );

  const policyQuantity = calculatePolicyReorderQuantity({
    dailyUsage: input.dailyUsage,
    leadTimeDays: input.leadTimeDays,
    safetyStock: input.safetyStockTarget,
    currentStock: input.onHandStock,
    incomingQuantity: input.inboundQuantity,
    targetCoverDays: input.targetCoverDays,
  });
  const emergencyQuantity = calculateEmergencyOrderQuantity(projectionSummary.shortageBeforeReplenishment, input.safetyStockTarget);

  return {
    summary: {
      daysOfStock,
      stockOutDate,
      replenishmentDate,
      gapDays,
      shortageQuantity: projectionSummary.shortageBeforeReplenishment,
      risk,
    },
    projection,
    dailyUsage: input.dailyUsage,
    replenishmentDayIndex: input.replenishmentDayIndex,
    shortageBeforeReplenishment: projectionSummary.shortageBeforeReplenishment,
    requiredOrderQuantity: calculateSuggestedOrderQuantity(policyQuantity, emergencyQuantity),
    arrivals: input.arrivals,
  };
}

export interface ScenarioComparison {
  baseline: ScenarioRun;
  simulated: ScenarioRun;
  /** Headline sentence explaining whether risk improved, worsened or stayed the same. */
  headline: string;
  /** Supporting sentences generated from the numbers above. */
  points: string[];
  riskDirection: 'improved' | 'worsened' | 'unchanged';
  settings: ScenarioSettings;
}

/** Runs the baseline (no changes) and the simulated scenario for one item. */
export function simulateScenario(
  item: InventoryItem,
  rawSettings: ScenarioSettings,
  asOfDate: string,
  thresholds: RiskThresholds,
  horizonDays: number,
  targetCoverDays: number,
): ScenarioComparison {
  const settings = clampScenario(rawSettings, horizonDays);
  const baseReplenishmentDate = calculateReplenishmentDate(asOfDate, item.expectedDeliveryDate, item.leadTimeDays);
  const baseReplenishmentIndex = calculateDaysUntilReplenishment(asOfDate, baseReplenishmentDate);
  const scheduledArrivals: ArrivalEvent[] = item.expectedDeliveryDate
    ? [{ dayIndex: baseReplenishmentIndex, quantity: item.incomingQuantity }]
    : [];

  const baseline = runScenario({
    asOfDate,
    onHandStock: item.currentStock,
    stockForDaysOfCover: item.currentStock,
    dailyUsage: item.averageDailyUsage,
    minimumStock: item.minimumStock,
    leadTimeDays: item.leadTimeDays,
    replenishmentDayIndex: baseReplenishmentIndex,
    arrivals: scheduledArrivals,
    inboundQuantity: item.incomingQuantity,
    safetyStockTarget: item.safetyStock,
    targetCoverDays,
    horizonDays,
    thresholds,
  });

  const simulatedUsage = item.averageDailyUsage * (1 + settings.demandChangePercent / 100) * (1 - settings.demandReductionPercent / 100);
  const simulatedReplenishmentIndex = baseReplenishmentIndex + settings.deliveryDelayDays;
  const simulatedArrivals: ArrivalEvent[] = [
    ...(item.expectedDeliveryDate
      ? [{ dayIndex: simulatedReplenishmentIndex, quantity: item.incomingQuantity }]
      : []),
    ...(settings.transferQuantity > 0
      ? [{ dayIndex: SCENARIO_LIMITS.transferArrivalDay, quantity: settings.transferQuantity }]
      : []),
    ...(settings.additionalOrderQuantity > 0
      ? [{ dayIndex: settings.additionalOrderArrivalDay, quantity: settings.additionalOrderQuantity }]
      : []),
  ];
  const simulatedInbound = item.incomingQuantity + settings.transferQuantity + settings.additionalOrderQuantity;

  const simulated = runScenario({
    asOfDate,
    onHandStock: item.currentStock,
    stockForDaysOfCover: item.currentStock + settings.transferQuantity,
    dailyUsage: simulatedUsage,
    minimumStock: item.minimumStock,
    leadTimeDays: item.leadTimeDays,
    replenishmentDayIndex: simulatedReplenishmentIndex,
    arrivals: simulatedArrivals,
    inboundQuantity: simulatedInbound,
    safetyStockTarget: settings.safetyStockTarget,
    targetCoverDays,
    horizonDays,
    thresholds,
  });

  // compareRiskLevels orders critical < warning < safe, so a negative result means the simulated risk is more severe.
  const riskOrder = compareRiskLevels(simulated.summary.risk, baseline.summary.risk);
  const direction: ScenarioComparison['riskDirection'] =
    riskOrder < 0 ? 'worsened' : riskOrder > 0 ? 'improved' : 'unchanged';
  const { headline, points } = describeScenarioChange({
    item,
    settings,
    baseline,
    simulated,
    direction,
    simulatedUsage,
    baseReplenishmentDate,
  });

  return { baseline, simulated, headline, points, riskDirection: direction, settings };
}

function describeScenarioChange(input: {
  item: InventoryItem;
  settings: ScenarioSettings;
  baseline: ScenarioRun;
  simulated: ScenarioRun;
  direction: ScenarioComparison['riskDirection'];
  simulatedUsage: number;
  baseReplenishmentDate: string;
}): { headline: string; points: string[] } {
  const { item, settings, baseline, simulated, direction, simulatedUsage, baseReplenishmentDate } = input;
  const points: string[] = [];
  const baseRisk = RISK_LABELS[baseline.summary.risk];
  const simRisk = RISK_LABELS[simulated.summary.risk];

  if (settings.demandChangePercent !== 0 || settings.demandReductionPercent !== 0) {
    points.push(
      `Daily use changes from ${formatDecimal(item.averageDailyUsage)} to ${formatDecimal(simulatedUsage)} ${item.unit}/day.`,
    );
  }
  if (settings.deliveryDelayDays > 0) {
    points.push(
      `Replenishment moves from ${formatLongDate(baseReplenishmentDate)} to ${formatLongDate(simulated.summary.replenishmentDate)} (+${settings.deliveryDelayDays} days).`,
    );
  }
  if (settings.transferQuantity > 0) {
    points.push(`${formatQuantity(settings.transferQuantity, item.unit)} transferred in from another location, arriving tomorrow.`);
  }
  if (settings.additionalOrderQuantity > 0) {
    points.push(
      `An extra ${formatQuantity(settings.additionalOrderQuantity, item.unit)} arrives in ${settings.additionalOrderArrivalDay} day${settings.additionalOrderArrivalDay === 1 ? '' : 's'}.`,
    );
  }
  const baseGap = baseline.summary.gapDays;
  const simGap = simulated.summary.gapDays;
  if (baseGap !== simGap) {
    points.push(`The shortage window changes from ${baseGap} day${baseGap === 1 ? '' : 's'} to ${simGap} day${simGap === 1 ? '' : 's'}.`);
  }
  if (baseline.shortageBeforeReplenishment !== simulated.shortageBeforeReplenishment) {
    points.push(
      `Units short before replenishment change from ${formatQuantity(baseline.shortageBeforeReplenishment, item.unit)} to ${formatQuantity(simulated.shortageBeforeReplenishment, item.unit)}.`,
    );
  }
  if (points.length === 0) {
    points.push('No scenario changes are applied yet. Adjust a control to compare with the baseline.');
  }

  const shortageChanged = baseline.shortageBeforeReplenishment !== simulated.shortageBeforeReplenishment;
  const headline =
    direction === 'unchanged'
      ? shortageChanged
        ? `Risk stays ${simRisk}, but the shortage before replenishment ${simulated.shortageBeforeReplenishment < baseline.shortageBeforeReplenishment ? 'falls' : 'rises'} under this scenario.`
        : `Risk stays ${simRisk} under this scenario.`
      : direction === 'improved'
        ? `Risk improves from ${baseRisk} to ${simRisk} under this scenario.`
        : `Risk worsens from ${baseRisk} to ${simRisk} under this scenario.`;

  return { headline, points };
}

export interface ScenarioPreset {
  id: string;
  label: string;
  description: string;
  apply: (item: InventoryItem, current: ScenarioSettings) => ScenarioSettings;
}

/** Quick scenarios offered on the simulator page. Each one only changes the controls it names. */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'demand-up-20',
    label: 'Demand increases by 20%',
    description: 'Daily use rises by 20% for the whole horizon.',
    apply: (_item, current) => ({ ...current, demandChangePercent: 20 }),
  },
  {
    id: 'delivery-delayed-3',
    label: 'Delivery delayed by 3 days',
    description: 'The supplier delivers three days later than scheduled.',
    apply: (_item, current) => ({ ...current, deliveryDelayDays: 3 }),
  },
  {
    id: 'emergency-order-early',
    label: 'Emergency order arrives early',
    description: 'An extra order of one lead time of demand arrives in 2 days.',
    apply: (item, current) => ({
      ...current,
      additionalOrderQuantity: Math.max(1, Math.ceil(item.averageDailyUsage * item.leadTimeDays)),
      additionalOrderArrivalDay: 2,
    }),
  },
  {
    id: 'stock-transferred',
    label: 'Stock transferred from another location',
    description: 'Uses the stock recorded at other locations. Zero if none is recorded.',
    apply: (item, current) => ({ ...current, transferQuantity: item.stockHeldElsewhere }),
  },
];

/** Plain-language summary of a stock-out date for the simulator. */
export function describeStockOut(summary: ShortageSummary, asOfDate: string): string {
  if (summary.stockOutDate === null) return 'No stock-out recorded (no usage)';
  const days = diffDays(asOfDate, summary.stockOutDate);
  return `${formatLongDate(summary.stockOutDate)} (${days === 0 ? 'today' : `in ${formatWholeDaysRemaining(days)}`})`;
}

export function formatScenarioDelta(percent: number): string {
  return formatSignedPercent(percent);
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
