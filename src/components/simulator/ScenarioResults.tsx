import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts';
import type { InventoryItem } from '../../types/inventory';
import type { ScenarioComparison } from '../../lib/scenarios';
import { formatLongDate, formatShortDate } from '../../lib/dates';
import { formatDecimal, formatQuantity, formatWholeDaysRemaining } from '../../lib/formatters';
import { RiskBadge } from '../common/StatusBadge';
import { SectionCard } from '../common/SectionCard';
import { ChartFigure } from '../charts/ChartFigure';
import { ChartLegend, ChartTooltipBox } from '../charts/ChartTooltip';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from '../charts/chartTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { ShortageSummary } from '../../types/forecast';

interface ScenarioResultsProps {
  item: InventoryItem;
  comparison: ScenarioComparison;
  asOfDate: string;
}

function formatDays(summary: ShortageSummary): string {
  return summary.daysOfStock === null ? 'No usage recorded' : formatWholeDaysRemaining(summary.daysOfStock);
}

/** Baseline and simulated results side by side. Both use the same formulas as the Inventory page. */
export function ScenarioResults({ item, comparison, asOfDate }: ScenarioResultsProps) {
  const reduced = useReducedMotion();
  const { baseline, simulated } = comparison;
  const headlineClass = comparison.riskDirection === 'improved' ? 'scenario-headline--improved' : comparison.riskDirection === 'worsened' ? 'scenario-headline--worsened' : '';

  const data = baseline.projection.map((point, index) => ({
    date: point.date,
    baseline: point.projectedStock,
    simulated: simulated.projection[index]?.projectedStock ?? null,
  }));

  const rows: { label: string; base: string; sim: string; changed: boolean }[] = [
    { label: 'Days of stock', base: formatDays(baseline.summary), sim: formatDays(simulated.summary), changed: baseline.summary.daysOfStock !== simulated.summary.daysOfStock },
    {
      label: 'Runs out at current use',
      base: baseline.summary.stockOutDate ? formatLongDate(baseline.summary.stockOutDate) : 'Not within horizon',
      sim: simulated.summary.stockOutDate ? formatLongDate(simulated.summary.stockOutDate) : 'Not within horizon',
      changed: baseline.summary.stockOutDate !== simulated.summary.stockOutDate,
    },
    { label: 'Replenishment', base: formatLongDate(baseline.summary.replenishmentDate), sim: formatLongDate(simulated.summary.replenishmentDate), changed: baseline.summary.replenishmentDate !== simulated.summary.replenishmentDate },
    { label: 'Gap before replenishment', base: `${baseline.summary.gapDays} days`, sim: `${simulated.summary.gapDays} days`, changed: baseline.summary.gapDays !== simulated.summary.gapDays },
    { label: 'Shortage before replenishment', base: formatQuantity(baseline.shortageBeforeReplenishment, item.unit), sim: formatQuantity(simulated.shortageBeforeReplenishment, item.unit), changed: baseline.shortageBeforeReplenishment !== simulated.shortageBeforeReplenishment },
    { label: 'Suggested order quantity', base: formatQuantity(baseline.requiredOrderQuantity, item.unit), sim: formatQuantity(simulated.requiredOrderQuantity, item.unit), changed: baseline.requiredOrderQuantity !== simulated.requiredOrderQuantity },
  ];

  return (
    <div className="stack-4">
      <div className={`scenario-headline ${headlineClass}`} role="status">
        {comparison.headline}
      </div>

      <SectionCard title="Baseline and simulated" description={`Compared for ${item.name} as of ${formatShortDate(asOfDate)}. Estimates from demo values, not operational outcomes.`}>
        <div className="compare-grid" role="table" aria-label="Baseline and simulated results">
          <div className="compare-grid__head" role="columnheader">
            Measure
          </div>
          <div className="compare-grid__head" role="columnheader">
            Baseline (current plan)
          </div>
          <div className="compare-grid__head" role="columnheader">
            Simulated
          </div>
          {rows.map((row) => (
            <div key={row.label} style={{ display: 'contents' }} role="row">
              <div role="cell">{row.label}</div>
              <div role="cell" className="num">
                {row.base}
              </div>
              <div role="cell" className={`num ${row.changed ? 'compare-grid__value--changed' : ''}`}>
                {row.sim}
              </div>
            </div>
          ))}
          <div role="cell">Risk</div>
          <div role="cell">
            <RiskBadge risk={baseline.summary.risk} />
          </div>
          <div role="cell">
            <RiskBadge risk={simulated.summary.risk} />
          </div>
        </div>
        {comparison.points.length > 0 && (
          <ul className="text-small" style={{ margin: '14px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
            {comparison.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Projected stock under each scenario" description="Both lines are rule-based estimates over the forecast horizon.">
        <ChartFigure label={`Projected stock for ${item.name}. Baseline ends at ${formatDecimal(baseline.projection.at(-1)?.projectedStock ?? 0)} ${item.unit}; simulated ends at ${formatDecimal(simulated.projection.at(-1)?.projectedStock ?? 0)} ${item.unit}.`}>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={28} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatDecimal(value)} />
            <ReferenceLine y={0} stroke={CHART_COLORS.muted} />
            <Tooltip
              content={(props) => {
                const point = props.payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!props.active || !point) return null;
                return (
                  <ChartTooltipBox
                    title={formatShortDate(point.date)}
                    rows={[
                      { name: 'Baseline', value: `${formatDecimal(point.baseline)} ${item.unit}`, color: CHART_COLORS.neutral },
                      ...(point.simulated !== null ? [{ name: 'Simulated', value: `${formatDecimal(point.simulated)} ${item.unit}`, color: CHART_COLORS.accent }] : []),
                    ]}
                    note="Rule-based estimate"
                  />
                );
              }}
            />
            <Line type="monotone" dataKey="baseline" stroke={CHART_COLORS.neutral} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduced} />
            <Line type="monotone" dataKey="simulated" stroke={CHART_COLORS.accent} strokeWidth={2.5} dot={false} isAnimationActive={!reduced} />
          </LineChart>
        </ChartFigure>
        <ChartLegend
          items={[
            { label: 'Baseline (current plan)', color: CHART_COLORS.neutral, dashed: true },
            { label: 'Simulated', color: CHART_COLORS.accent },
          ]}
        />
      </SectionCard>
    </div>
  );
}
