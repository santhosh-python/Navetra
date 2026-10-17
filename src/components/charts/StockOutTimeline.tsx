import { Link } from 'react-router-dom';
import type { InventoryRow } from '../../lib/inventoryQuery';
import { diffDays, formatShortDate, addDays } from '../../lib/dates';
import { formatWholeDaysRemaining } from '../../lib/formatters';

interface StockOutTimelineProps {
  rows: InventoryRow[];
  asOfDate: string;
  horizonDays: number;
  /** Maximum rows to draw. Rows are already sorted by urgency by the caller. */
  limit?: number;
}

const AXIS_DAYS = [0, 7, 14, 21, 30];

/**
 * Stock-out timeline: one row per item, from today across the horizon.
 * Solid bar = stock lasts. Hatched = shortage before the next delivery. Dark tick = replenishment date.
 * Drawn with plain elements (not a chart library) so it stays readable with assistive technology.
 */
export function StockOutTimeline({ rows, asOfDate, horizonDays, limit = 10 }: StockOutTimelineProps) {
  const visible = rows.slice(0, limit);
  const percent = (day: number) => `${Math.max(0, Math.min(100, (day / horizonDays) * 100))}%`;

  if (visible.length === 0) {
    return <p className="text-muted text-small">No items to show.</p>;
  }

  return (
    <div>
      <div className="gantt" role="list" aria-label="Projected stock-out timeline">
        {visible.map(({ item, analysis }) => {
          const stockOutDay = analysis.stockOutDate ? diffDays(asOfDate, analysis.stockOutDate) : null;
          const replenishDay = diffDays(asOfDate, analysis.replenishmentDate);
          const barEnd = stockOutDay === null ? horizonDays : Math.min(stockOutDay, horizonDays);
          const barClass = analysis.risk === 'critical' ? 'gantt__bar--critical' : analysis.risk === 'warning' ? 'gantt__bar--warning' : 'gantt__bar--safe';
          const gapStart = stockOutDay !== null && analysis.gapDays > 0 ? stockOutDay : null;
          const gapEnd = gapStart === null ? null : Math.min(replenishDay, horizonDays);
          const stockOutText =
            stockOutDay === null
              ? 'No usage recorded'
              : stockOutDay > horizonDays
                ? `Beyond ${horizonDays} days`
                : `${formatShortDate(analysis.stockOutDate)} (${formatWholeDaysRemaining(stockOutDay)})`;

          return (
            <div key={item.id} className="gantt__row" role="listitem">
              <Link to={`/inventory/${encodeURIComponent(item.id)}`} className="gantt__label" title={`${item.name}: open item`} style={{ textDecoration: 'none' }}>
                {item.name}
              </Link>
              <div>
                <div className="gantt__track" aria-hidden="true">
                  <div className={`gantt__bar ${barClass}`} style={{ left: 0, width: percent(barEnd) }} />
                  {gapStart !== null && gapEnd !== null && gapEnd > gapStart && (
                    <div className="gantt__gap" style={{ left: percent(gapStart), width: `calc(${percent(gapEnd)} - ${percent(gapStart)})` }} />
                  )}
                  {replenishDay <= horizonDays && <div className="gantt__marker gantt__marker--delivery" style={{ left: percent(replenishDay) }} />}
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Stock-out: {stockOutText}
                  {analysis.gapDays > 0 && <span className="text-critical"> · {analysis.gapDays}-day gap</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="gantt__axis" aria-hidden="true">
        <span />
        <div className="gantt__axis-track">
          {AXIS_DAYS.map((day) => (
            <span key={day}>{day === 0 ? `Today ${formatShortDate(asOfDate)}` : formatShortDate(addDays(asOfDate, day))}</span>
          ))}
        </div>
      </div>
      <div className="gantt-summary">
        <span className="row" style={{ gap: 6 }}>
          <span className="chart-legend__swatch" style={{ background: 'rgba(200,61,67,0.5)' }} aria-hidden="true" />
          Stock lasts (colour by risk)
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span className="chart-legend__swatch" style={{ background: 'repeating-linear-gradient(45deg, rgba(200,61,67,.55) 0 4px, rgba(200,61,67,.18) 4px 8px)' }} aria-hidden="true" />
          Shortage before delivery
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span className="chart-legend__swatch" style={{ background: '#3978B7', width: 3, height: 12 }} aria-hidden="true" />
          Replenishment date
        </span>
      </div>
      <p className="chart-note">Estimates assume usage stays at the recorded average. Timeline covers {horizonDays} days.</p>
    </div>
  );
}
