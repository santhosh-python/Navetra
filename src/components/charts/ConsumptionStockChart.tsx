import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyObservation } from '../../types/inventory';
import { formatShortDate } from '../../lib/dates';
import { formatDecimal } from '../../lib/formatters';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartLegend, ChartTooltipBox } from './ChartTooltip';

interface ConsumptionStockChartProps {
  history: DailyObservation[];
  unit: string;
  itemName: string;
}

/** Observed daily use (bars) against closing stock (line), both from the same 30-day record. */
export function ConsumptionStockChart({ history, unit, itemName }: ConsumptionStockChartProps) {
  const reduced = useReducedMotion();
  const data = history.map((day) => ({
    date: day.date,
    consumption: day.consumption,
    closingStock: day.openingStock - day.consumption + day.received,
  }));
  const peakUse = data.reduce((max, point) => Math.max(max, point.consumption), 0);
  const summary = `Observed use and closing stock for ${itemName} over ${data.length} days. Peak daily use ${formatDecimal(peakUse)} ${unit}.`;

  return (
    <div>
      <ChartFigure label={summary}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={24} />
          <YAxis yAxisId="use" tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} tickFormatter={(value: number) => formatDecimal(value)} />
          <YAxis yAxisId="stock" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} tickFormatter={(value: number) => formatDecimal(value)} />
          <Tooltip
            content={(props) => {
              const point = props.payload?.[0]?.payload as (typeof data)[number] | undefined;
              if (!props.active || !point) return null;
              return (
                <ChartTooltipBox
                  title={formatShortDate(point.date)}
                  rows={[
                    { name: 'Used that day', value: `${formatDecimal(point.consumption)} ${unit}`, color: CHART_COLORS.info },
                    { name: 'Closing stock', value: `${formatDecimal(point.closingStock)} ${unit}`, color: CHART_COLORS.text },
                  ]}
                />
              );
            }}
          />
          <Bar yAxisId="use" dataKey="consumption" fill={CHART_COLORS.info} fillOpacity={0.55} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} />
          <Line yAxisId="stock" type="monotone" dataKey="closingStock" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} isAnimationActive={!reduced} />
        </ComposedChart>
      </ChartFigure>
      <ChartLegend
        items={[
          { label: `Used per day (${unit}, left axis)`, color: CHART_COLORS.info },
          { label: `Closing stock (${unit}, right axis)`, color: CHART_COLORS.text },
        ]}
      />
    </div>
  );
}
