import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { RISK_LABELS, RISK_LEVEL_ORDER } from '../../lib/riskClassification';
import type { RiskLevel } from '../../types/inventory';
import { RISK_CHART_COLORS } from './chartTheme';
import { ChartTooltipBox } from './ChartTooltip';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface RiskDonutProps {
  counts: Record<RiskLevel, number>;
  total: number;
  selected: RiskLevel | 'all';
  onSelect: (risk: RiskLevel | 'all') => void;
}

/**
 * Donut of risk counts. Clicking a segment or a legend button filters the table on the page.
 * The legend repeats every value as text, so colour is never the only cue.
 */
export function RiskDonut({ counts, total, selected, onSelect }: RiskDonutProps) {
  const reduced = useReducedMotion();
  const data = RISK_LEVEL_ORDER.map((risk) => ({ risk, name: RISK_LABELS[risk], value: counts[risk] }));
  const summary = RISK_LEVEL_ORDER.map((risk) => `${RISK_LABELS[risk]} ${counts[risk]}`).join(', ');

  return (
    <div>
      <div className="donut-wrap" role="img" aria-label={`Risk mix of ${total} items: ${summary}`}>
        <PieChart width={220} height={220} style={{ margin: '0 auto' }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={66}
            outerRadius={98}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={!reduced}
            onClick={(entry) => {
              const risk = (entry as unknown as { risk: RiskLevel }).risk;
              onSelect(selected === risk ? 'all' : risk);
            }}
            style={{ cursor: 'pointer' }}
          >
            {data.map((entry) => (
              <Cell key={entry.risk} fill={RISK_CHART_COLORS[entry.risk]} opacity={selected === 'all' || selected === entry.risk ? 1 : 0.25} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => {
              const entry = props.payload?.[0];
              if (!props.active || !entry) return null;
              return <ChartTooltipBox title={String(entry.name)} rows={[{ name: 'Items', value: String(entry.value) }]} />;
            }}
          />
        </PieChart>
        <div className="donut-center" aria-hidden="true">
          <span className="donut-center__value">{total}</span>
          <span className="donut-center__label">items</span>
        </div>
      </div>
      <div className="risk-legend">
        <button type="button" className="risk-legend__button" aria-pressed={selected === 'all'} onClick={() => onSelect('all')}>
          <span>All items</span>
          <span className="num">{total}</span>
        </button>
        {RISK_LEVEL_ORDER.map((risk) => (
          <button key={risk} type="button" className="risk-legend__button" aria-pressed={selected === risk} onClick={() => onSelect(selected === risk ? 'all' : risk)}>
            <span className="row" style={{ gap: 8 }}>
              <span className="chart-legend__swatch" style={{ background: RISK_CHART_COLORS[risk] }} aria-hidden="true" />
              {RISK_LABELS[risk]}
            </span>
            <span className="num">{counts[risk]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
