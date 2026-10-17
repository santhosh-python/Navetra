import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { CategoryRiskRow, CriticalityScatterPoint } from '../../lib/analytics';
import type { SupplierLeadTimeSummary } from '../../lib/deliveries';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AXIS_LINE, AXIS_TICK, CHART_COLORS, GRID_PROPS, RISK_CHART_COLORS } from './chartTheme';
import { ChartFigure } from './ChartFigure';
import { ChartTooltipBox } from './ChartTooltip';
import { RISK_LABELS } from '../../lib/riskClassification';

/** Items per category, split by risk level. Stacked so totals and mix are both readable. */
export function CategoryRiskChart({ data }: { data: CategoryRiskRow[] }) {
  const reduced = useReducedMotion();
  const summary = data.map((row) => `${row.category}: ${row.critical} critical, ${row.warning} warning, ${row.safe} safe`).join('; ');
  return (
    <ChartFigure label={`Items by category and risk. ${summary}.`} height="tall">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
        <CartesianGrid {...GRID_PROPS} horizontal={false} vertical />
        <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
        <YAxis type="category" dataKey="category" width={160} tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(25,29,35,0.04)' }}
          content={(props) => {
            const row = props.payload?.[0]?.payload as CategoryRiskRow | undefined;
            if (!props.active || !row) return null;
            return (
              <ChartTooltipBox
                title={row.category}
                rows={[
                  { name: RISK_LABELS.critical, value: String(row.critical), color: RISK_CHART_COLORS.critical },
                  { name: RISK_LABELS.warning, value: String(row.warning), color: RISK_CHART_COLORS.warning },
                  { name: RISK_LABELS.safe, value: String(row.safe), color: RISK_CHART_COLORS.safe },
                ]}
              />
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="critical" name={RISK_LABELS.critical} stackId="risk" fill={RISK_CHART_COLORS.critical} isAnimationActive={!reduced} />
        <Bar dataKey="warning" name={RISK_LABELS.warning} stackId="risk" fill={RISK_CHART_COLORS.warning} isAnimationActive={!reduced} />
        <Bar dataKey="safe" name={RISK_LABELS.safe} stackId="risk" fill={RISK_CHART_COLORS.safe} radius={[0, 4, 4, 0]} isAnimationActive={!reduced} />
      </BarChart>
    </ChartFigure>
  );
}

const CRITICALITY_TICKS = [1, 2, 3, 4];
const CRITICALITY_NAMES: Record<number, string> = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };

/** Criticality (x) against days of stock (y), capped at 30 days. Points are spread slightly so none overlap exactly. */
export function CriticalityScatterChart({ points }: { points: CriticalityScatterPoint[] }) {
  const reduced = useReducedMotion();
  const plotted = points.map((point) => ({ ...point, x: point.criticalityScore + point.jitter * 0.3 }));
  const groups = (['critical', 'warning', 'safe'] as const).map((risk) => ({ risk, data: plotted.filter((point) => point.risk === risk) }));
  return (
    <ChartFigure label={`Criticality against days of stock for ${points.length} items. Days are capped at 30.`} height="tall">
      <ScatterChart margin={{ top: 12, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} vertical />
        <XAxis type="number" dataKey="x" domain={[0.5, 4.5]} ticks={CRITICALITY_TICKS} tickFormatter={(value: number) => CRITICALITY_NAMES[Math.round(value)] ?? ''} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} name="Criticality" />
        <YAxis type="number" dataKey="daysOfStock" domain={[0, 30]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} name="Days of stock" label={{ value: 'Days of stock', angle: -90, position: 'insideLeft', fill: CHART_COLORS.muted, fontSize: 11 }} />
        <ZAxis range={[60, 60]} />
        <Tooltip
          cursor={false}
          content={(props) => {
            const point = props.payload?.[0]?.payload as (typeof plotted)[number] | undefined;
            if (!props.active || !point) return null;
            return (
              <ChartTooltipBox
                title={point.name}
                rows={[
                  { name: 'Criticality', value: point.criticalityLabel },
                  { name: 'Days of stock', value: point.daysOfStock >= 30 ? '30 or more' : String(point.daysOfStock) },
                  { name: 'Risk', value: RISK_LABELS[point.risk] },
                ]}
              />
            );
          }}
        />
        {groups.map((group) => (
          <Scatter key={group.risk} name={RISK_LABELS[group.risk]} data={group.data} fill={RISK_CHART_COLORS[group.risk]} fillOpacity={0.85} isAnimationActive={!reduced} />
        ))}
        <ReferenceLine y={7} stroke={CHART_COLORS.critical} strokeDasharray="3 3" label={{ value: '7 days', position: 'insideTopRight', fill: CHART_COLORS.critical, fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </ScatterChart>
    </ChartFigure>
  );
}

/** Promised against actual lead time per supplier, for received deliveries. */
export function LeadTimeChart({ data }: { data: SupplierLeadTimeSummary[] }) {
  const reduced = useReducedMotion();
  const summary = data.map((row) => `${row.supplierName}: promised ${row.averageExpectedDays} days, actual ${row.averageActualDays} days`).join('; ');
  return (
    <ChartFigure label={`Average lead time by supplier. ${summary}.`}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} />
        <XAxis dataKey="supplierName" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} interval={0} tickFormatter={(value: string) => (value.length > 16 ? `${value.slice(0, 15)}…` : value)} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} label={{ value: 'Days', angle: -90, position: 'insideLeft', fill: CHART_COLORS.muted, fontSize: 11 }} />
        <Tooltip
          cursor={{ fill: 'rgba(25,29,35,0.04)' }}
          content={(props) => {
            const row = props.payload?.[0]?.payload as SupplierLeadTimeSummary | undefined;
            if (!props.active || !row) return null;
            return (
              <ChartTooltipBox
                title={row.supplierName}
                rows={[
                  { name: 'Promised', value: `${row.averageExpectedDays} days`, color: CHART_COLORS.neutral },
                  { name: 'Actual', value: `${row.averageActualDays} days`, color: CHART_COLORS.info },
                  { name: 'Late deliveries', value: `${row.lateCount} of ${row.receivedCount}` },
                ]}
              />
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="averageExpectedDays" name="Promised (days)" fill={CHART_COLORS.neutral} radius={[4, 4, 0, 0]} isAnimationActive={!reduced} maxBarSize={36} />
        <Bar dataKey="averageActualDays" name="Actual (days)" fill={CHART_COLORS.info} radius={[4, 4, 0, 0]} isAnimationActive={!reduced} maxBarSize={36} />
      </BarChart>
    </ChartFigure>
  );
}
