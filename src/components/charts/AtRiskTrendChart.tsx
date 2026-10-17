import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { AtRiskTrendPoint } from '../../lib/portfolio';
import { formatShortDate } from '../../lib/dates';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartLegend, ChartTooltipBox } from './ChartTooltip';

interface AtRiskTrendChartProps {
  points: AtRiskTrendPoint[];
  asOfDate: string;
  warningDays: number;
}

/** Number of items at or below the warning threshold, per day. Observed before today, estimated after. */
export function AtRiskTrendChart({ points, asOfDate, warningDays }: AtRiskTrendChartProps) {
  const reduced = useReducedMotion();
  const data = points.map((point, index) => ({
    date: point.date,
    observed: point.isEstimate ? (index > 0 && !points[index - 1].isEstimate ? point.count : null) : point.count,
    estimated: point.isEstimate ? point.count : null,
  }));
  const latestObserved = points.filter((point) => !point.isEstimate).at(-1)?.count ?? 0;
  const summary = `Items at warning level or below (${warningDays} days of stock or less). ${latestObserved} on the as-of date, with a 30-day rule-based estimate after.`;

  return (
    <div>
      <ChartFigure label={summary}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={28} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            content={(props) => {
              const point = props.payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!props.active || !point) return null;
              const count = point.observed ?? point.estimated ?? 0;
              const isEstimate = point.estimated !== null;
              return (
                <ChartTooltipBox
                  title={formatShortDate(point.date)}
                  rows={[{ name: 'Items at warning or below', value: String(count), color: isEstimate ? CHART_COLORS.accent : CHART_COLORS.text }]}
                  note={isEstimate ? 'Rule-based estimate' : 'Observed'}
                />
              );
            }}
          />
          <ReferenceLine x={asOfDate} stroke={CHART_COLORS.muted} strokeDasharray="2 3" label={{ value: 'Today', position: 'insideTopRight', fill: CHART_COLORS.muted, fontSize: 11 }} />
          <Line type="monotone" dataKey="observed" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!reduced} />
          <Line type="monotone" dataKey="estimated" stroke={CHART_COLORS.accent} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={!reduced} />
        </LineChart>
      </ChartFigure>
      <ChartLegend
        items={[
          { label: 'Observed (30 days)', color: CHART_COLORS.text },
          { label: 'Rule-based estimate (30 days)', color: CHART_COLORS.accent, dashed: true },
        ]}
      />
    </div>
  );
}
