import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyObservation } from '../../types/inventory';
import type { ProjectionPoint } from '../../types/forecast';
import { formatShortDate } from '../../lib/dates';
import { formatDecimal } from '../../lib/formatters';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartLegend, ChartTooltipBox } from './ChartTooltip';

interface ForecastChartProps {
  history: DailyObservation[];
  projection: ProjectionPoint[];
  stockOutDate: string | null;
  replenishmentDate: string;
  unit: string;
  itemName: string;
}

interface ChartPoint {
  date: string;
  observed?: number;
  projected?: number;
}

/**
 * Observed stock (solid, from the 30-day record) followed by the rule-based projection (dashed, estimate).
 * Observed values and estimates are never drawn with the same style.
 */
export function ForecastChart({ history, projection, stockOutDate, replenishmentDate, unit, itemName }: ForecastChartProps) {
  const reduced = useReducedMotion();
  const byDate = new Map<string, ChartPoint>();
  for (const day of history) {
    byDate.set(day.date, { date: day.date, observed: day.openingStock - day.consumption + day.received });
  }
  for (const point of projection) {
    const existing = byDate.get(point.date) ?? { date: point.date };
    byDate.set(point.date, { ...existing, projected: point.projectedStock });
  }
  const data = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  const dates = new Set(data.map((point) => point.date));
  const lastProjected = projection[projection.length - 1];
  const summary = `Stock for ${itemName}: ${history.length} days observed, then a ${projection.length}-day rule-based estimate.` +
    (stockOutDate && dates.has(stockOutDate) ? ` Runs out at current use on ${formatShortDate(stockOutDate)}.` : ' No stock-out inside the projection window at current use.') +
    (lastProjected ? ` Projected stock on the last day: ${formatDecimal(lastProjected.projectedStock)} ${unit}.` : '');

  return (
    <div>
      <ChartFigure label={summary} height="tall">
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={24} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatDecimal(value)} />
          <Tooltip
            content={(props) => {
              const point = props.payload?.[0]?.payload as ChartPoint | undefined;
              if (!props.active || !point) return null;
              const rows = [
                ...(point.observed !== undefined ? [{ name: 'Observed stock', value: `${formatDecimal(point.observed)} ${unit}`, color: CHART_COLORS.text }] : []),
                ...(point.projected !== undefined ? [{ name: 'Estimated stock', value: `${formatDecimal(point.projected)} ${unit}`, color: CHART_COLORS.accent }] : []),
              ];
              return (
                <ChartTooltipBox
                  title={formatShortDate(point.date)}
                  rows={rows}
                  note={point.projected !== undefined ? 'Rule-based estimate, not an observation' : undefined}
                />
              );
            }}
          />
          <ReferenceLine y={0} stroke={CHART_COLORS.muted} strokeWidth={1} />
          {stockOutDate && dates.has(stockOutDate) && (
            <ReferenceLine x={stockOutDate} stroke={CHART_COLORS.critical} strokeDasharray="4 3" label={{ value: 'Runs out at current use', position: 'insideTopLeft', fill: CHART_COLORS.critical, fontSize: 11 }} />
          )}
          {dates.has(replenishmentDate) && (
            <ReferenceLine x={replenishmentDate} stroke={CHART_COLORS.info} strokeDasharray="2 3" label={{ value: 'Replenishment', position: 'insideTopRight', fill: CHART_COLORS.info, fontSize: 11 }} />
          )}
          <Area type="monotone" dataKey="projected" fill={CHART_COLORS.accent} fillOpacity={0.08} stroke="none" isAnimationActive={!reduced} connectNulls={false} />
          <Line type="monotone" dataKey="observed" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} isAnimationActive={!reduced} connectNulls={false} />
          <Line type="monotone" dataKey="projected" stroke={CHART_COLORS.accent} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduced} connectNulls={false} />
        </ComposedChart>
      </ChartFigure>
      <ChartLegend
        items={[
          { label: 'Observed stock (last 30 days)', color: CHART_COLORS.text },
          { label: 'Estimated stock (rule-based)', color: CHART_COLORS.accent, dashed: true },
        ]}
      />
    </div>
  );
}
