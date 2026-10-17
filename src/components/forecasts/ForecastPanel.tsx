import { useMemo } from 'react';
import type { InventoryItem } from '../../types/inventory';
import type { InventoryRow } from '../../lib/inventoryQuery';
import { useInventory } from '../../hooks/useInventory';
import { useSettings } from '../../hooks/useSettings';
import { getForecastSnapshot } from '../../services/forecastService';
import { buildForecastAssumptions, generateForecastExplanation } from '../../lib/forecastExplanation';
import { formatDecimal, formatQuantity, formatWholeDaysRemaining } from '../../lib/formatters';
import { formatLongDate } from '../../lib/dates';
import { ForecastChart } from '../charts/ForecastChart';
import { SectionCard } from '../common/SectionCard';
import { Badge } from '../common/StatusBadge';

interface ForecastPanelProps {
  item: InventoryItem;
  row: InventoryRow;
}

/**
 * Forecast for one item: chart, plain-language explanation and assumptions.
 * Every figure comes from the same analysis the tables show.
 */
export function ForecastPanel({ item, row }: ForecastPanelProps) {
  const { asOfDate, historyByItemId } = useInventory();
  const { settings, riskThresholds } = useSettings();
  const history = historyByItemId[item.id] ?? [];

  const snapshot = useMemo(
    () => getForecastSnapshot(item, asOfDate, riskThresholds, settings.forecastHorizonDays, settings.targetCoverDays),
    [item, asOfDate, riskThresholds, settings.forecastHorizonDays, settings.targetCoverDays],
  );
  const explanation = generateForecastExplanation(item, row.analysis);
  const assumptions = buildForecastAssumptions(item, row.analysis, settings.forecastHorizonDays, asOfDate);

  return (
    <div className="stack-4">
      <SectionCard
        title="Stock projection"
        description={`Observed stock for the last 30 days, then a ${settings.forecastHorizonDays}-day estimate at the recorded average use.`}
        actions={<Badge tone="info">Rule-based estimate</Badge>}
      >
        <ForecastChart
          history={history}
          projection={snapshot.projection}
          stockOutDate={row.analysis.stockOutDate}
          replenishmentDate={row.analysis.replenishmentDate}
          unit={item.unit}
          itemName={item.name}
        />
        <div className="card__footer">
          The projection assumes usage stays at the recorded average and includes only scheduled deliveries. It is a planning estimate, not a machine-learning prediction.
        </div>
      </SectionCard>

      <div className="grid grid--two">
        <SectionCard title="Plain-language explanation" description="Generated from the values shown on this page.">
          <p className="explanation">{explanation}</p>
          <p className="text-xs text-subtle" style={{ marginTop: 10 }}>
            Stock lasts {row.analysis.daysOfStock === null ? 'an unknown time (no usage recorded)' : formatWholeDaysRemaining(row.analysis.daysOfStock)}. Replenishment on {formatLongDate(row.analysis.replenishmentDate)}.
          </p>
        </SectionCard>

        <SectionCard title="Assumptions" description="The inputs behind this estimate.">
          <dl className="assumption-list">
            {assumptions.map((assumption) => (
              <div key={assumption.label}>
                <dt>{assumption.label}</dt>
                <dd>{assumption.value}</dd>
              </div>
            ))}
            <div>
              <dt>Demand during lead time</dt>
              <dd>{formatQuantity(snapshot.demandDuringLeadTime, item.unit)} ({formatDecimal(item.leadTimeDays)} days)</dd>
            </div>
            <div>
              <dt>Reorder point</dt>
              <dd>{formatQuantity(row.analysis.reorderPoint, item.unit)}</dd>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
