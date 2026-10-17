import { Bar, BarChart, Cell, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartTooltipBox } from './ChartTooltip';

export interface BarDatum {
  label: string;
  value: number;
  /** Optional explicit colour (e.g. a risk colour). */
  color?: string;
}

interface SimpleBarChartProps {
  data: BarDatum[];
  label: string;
  valueLabel: string;
  valueFormatter: (value: number) => string;
  /** Horizontal bars suit long item names. */
  layout?: 'horizontal' | 'vertical';
  height?: 'default' | 'tall';
  color?: string;
}

export function SimpleBarChart({ data, label, valueLabel, valueFormatter, layout = 'horizontal', height = 'default', color = CHART_COLORS.info }: SimpleBarChartProps) {
  const reduced = useReducedMotion();
  const summary = `${label}. ${data.map((datum) => `${datum.label}: ${valueFormatter(datum.value)}`).join('; ')}.`;
  const isHorizontal = layout === 'vertical';
  return (
    <ChartFigure label={summary} height={height === 'tall' ? 'tall' : 'default'}>
      <BarChart data={data} layout={isHorizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 36, bottom: 0, left: isHorizontal ? 8 : 0 }}>
        <CartesianGrid {...GRID_PROPS} horizontal={!isHorizontal} vertical={isHorizontal} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} tickFormatter={(value: number) => valueFormatter(value)} />
            <YAxis type="category" dataKey="label" width={150} tick={AXIS_TICK} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval={0} />
            <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'rgba(25,29,35,0.04)' }}
          content={(props) => {
            const datum = props.payload?.[0]?.payload as BarDatum | undefined;
            if (!props.active || !datum) return null;
            return <ChartTooltipBox title={datum.label} rows={[{ name: valueLabel, value: valueFormatter(datum.value) }]} />;
          }}
        />
        <Bar dataKey="value" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} isAnimationActive={!reduced} maxBarSize={28}>
          {data.map((datum) => (
            <Cell key={datum.label} fill={datum.color ?? color} />
          ))}
          <LabelList dataKey="value" position={isHorizontal ? 'right' : 'top'} formatter={(value: unknown) => valueFormatter(Number(value))} style={{ fill: CHART_COLORS.muted, fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ChartFigure>
  );
}
