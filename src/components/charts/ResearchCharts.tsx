import { Area, Bar, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import type { ResearchBarDatum, ResearchDemandForecastPoint, ResearchForecastPoint, ResearchHistoryPoint, ResearchScenarioPoint } from '../../lib/researchCharts';
import { formatShortDate } from '../../lib/dates';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartLegend, ChartTooltipBox } from './ChartTooltip';
import { SimpleBarChart } from './SimpleBarChart';

export function ResearchBarChart({ data, label, valueLabel, color = CHART_COLORS.info, layout }: {
  data: ResearchBarDatum[];
  label: string;
  valueLabel: string;
  color?: string;
  layout?: 'horizontal' | 'vertical';
}) {
  const chartLayout = layout ?? (data.some((item) => item.label.length > 18) ? 'vertical' : 'horizontal');
  const valueFormatter = (value: number) => valueLabel.toLowerCase().includes('rate') ? `${value.toFixed(2)}%` : value.toLocaleString();
  return <SimpleBarChart data={data} label={label} valueLabel={valueLabel} valueFormatter={valueFormatter} layout={chartLayout} height={chartLayout === 'vertical' ? 'tall' : 'default'} color={color} />;
}

export function ResearchHistoryChart({ data, productName }: { data: ResearchHistoryPoint[]; productName: string }) {
  const reduced = useReducedMotion();
  return (
    <div>
      <ChartFigure label={`Observed consumption and closing stock for ${productName}. Stockout values use the source stockout label.`} height="tall">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={24} />
          <YAxis yAxisId="consumption" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis yAxisId="stock" orientation="right" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => {
            const item = props.payload?.[0]?.payload as ResearchHistoryPoint | undefined;
            return props.active && item ? <ChartTooltipBox title={formatShortDate(item.date)} rows={[
              { name: 'Consumption', value: String(item.consumption), color: CHART_COLORS.info },
              { name: 'Closing stock', value: String(item.stock), color: CHART_COLORS.text },
              { name: 'Source stockout', value: item.stockout === 1 ? 'Yes' : 'No', color: item.stockout === 1 ? CHART_COLORS.critical : CHART_COLORS.safe },
            ]} /> : null;
          }} />
          <Bar yAxisId="consumption" dataKey="consumption" fill={CHART_COLORS.info} fillOpacity={0.55} radius={[3, 3, 0, 0]} isAnimationActive={!reduced} />
          <Line yAxisId="stock" dataKey="stock" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} isAnimationActive={!reduced} />
        </ComposedChart>
      </ChartFigure>
      <ChartLegend items={[
        { label: 'Recorded consumption', color: CHART_COLORS.info },
        { label: 'Recorded closing stock', color: CHART_COLORS.text },
      ]} />
    </div>
  );
}

export function ResearchForecastChart({ data, productName }: { data: ResearchForecastPoint[]; productName: string }) {
  const reduced = useReducedMotion();
  return (
    <div>
      <ChartFigure label={`Observed and projected stock for ${productName}. Projected values are a rule-based estimate, not observations.`} height="tall">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={24} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => {
            const item = props.payload?.[0]?.payload as ResearchForecastPoint | undefined;
            return props.active && item ? <ChartTooltipBox title={formatShortDate(item.date)} rows={[
              ...(item.observedStock === null ? [] : [{ name: 'Observed stock', value: String(item.observedStock), color: CHART_COLORS.text }]),
              ...(item.projectedStock === null ? [] : [{ name: 'Projected stock', value: String(item.projectedStock), color: CHART_COLORS.accent }]),
            ]} note={item.projectedStock === null ? undefined : 'Rule-based estimate, not an observation'} /> : null;
          }} />
          <Area dataKey="projectedStock" fill={CHART_COLORS.accent} fillOpacity={0.08} stroke="none" isAnimationActive={!reduced} connectNulls={false} />
          <Line dataKey="observedStock" name="Observed stock" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!reduced} />
          <Line dataKey="projectedStock" name="Projected stock" stroke={CHART_COLORS.accent} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={!reduced} />
        </ComposedChart>
      </ChartFigure>
      <ChartLegend items={[
        { label: 'Observed stock', color: CHART_COLORS.text },
        { label: 'Rule-based projected stock', color: CHART_COLORS.accent, dashed: true },
      ]} />
    </div>
  );
}

export function ResearchDemandForecastChart({ data, productName }: { data: ResearchDemandForecastPoint[]; productName: string }) {
  const reduced = useReducedMotion();
  const forecastStart = data.find((point) => point.predictedConsumption !== null)?.date;
  return (
    <div>
      <ChartFigure label={`Observed and predicted consumption for ${productName}. Predicted values use the backend rolling-mean baseline.`} height="tall">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="date" tickFormatter={(value: string) => formatShortDate(value)} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} minTickGap={24} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => {
            const item = props.payload?.[0]?.payload as ResearchDemandForecastPoint | undefined;
            if (!props.active || !item) return null;
            const predicted = item.predictedConsumption !== null;
            return <ChartTooltipBox title={formatShortDate(item.date)} rows={[{
              name: predicted ? 'Predicted consumption' : 'Observed consumption',
              value: String(predicted ? item.predictedConsumption : item.observedConsumption),
              color: predicted ? CHART_COLORS.accent : CHART_COLORS.text,
            }]} note={predicted ? 'Backend rolling-mean baseline' : 'Historical observation'} />;
          }} />
          {forecastStart && <ReferenceLine x={forecastStart} stroke={CHART_COLORS.muted} strokeDasharray="2 3" label={{ value: 'Forecast starts', position: 'insideTopRight', fill: CHART_COLORS.muted, fontSize: 11 }} />}
          <Line dataKey="observedConsumption" name="Observed consumption" stroke={CHART_COLORS.text} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={!reduced} />
          <Line dataKey="predictedConsumption" name="Predicted consumption" stroke={CHART_COLORS.accent} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={!reduced} />
        </ComposedChart>
      </ChartFigure>
      <ChartLegend items={[
        { label: 'Observed consumption', color: CHART_COLORS.text },
        { label: 'Predicted consumption', color: CHART_COLORS.accent, dashed: true },
      ]} />
    </div>
  );
}

export function ResearchScenarioChart({ data }: { data: ResearchScenarioPoint[] }) {
  const reduced = useReducedMotion();
  return (
    <div>
      <ChartFigure label="User-supplied baseline and simulated stock over six scenario periods.">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="period" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip content={(props) => {
            const point = props.payload?.[0]?.payload as ResearchScenarioPoint | undefined;
            if (!props.active || !point) return null;
            return <ChartTooltipBox title={point.period} rows={[
              { name: 'Baseline stock', value: String(point.baselineStock), color: CHART_COLORS.neutral },
              { name: 'Simulated stock', value: String(point.simulatedStock), color: CHART_COLORS.accent },
            ]} note="Arithmetic scenario from user-supplied inputs" />;
          }} />
          <Line dataKey="baselineStock" stroke={CHART_COLORS.neutral} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduced} />
          <Line dataKey="simulatedStock" stroke={CHART_COLORS.accent} strokeWidth={2} dot={false} isAnimationActive={!reduced} />
        </LineChart>
      </ChartFigure>
      <ChartLegend items={[
        { label: 'Baseline', color: CHART_COLORS.neutral, dashed: true },
        { label: 'Simulated demand change', color: CHART_COLORS.accent },
      ]} />
    </div>
  );
}
