import type { ReactNode } from 'react';

export interface TooltipRow {
  name: string;
  value: string;
  color?: string;
}

/** Shared tooltip body. Each chart passes its own formatted rows, so numbers match the tables. */
export function ChartTooltipBox({ title, rows, note }: { title: ReactNode; rows: TooltipRow[]; note?: string }) {
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__title">{title}</div>
      {rows.map((row) => (
        <div key={row.name} className="chart-tooltip__row">
          <span className="row" style={{ gap: 6 }}>
            {row.color && <span className="chart-legend__swatch" style={{ background: row.color }} aria-hidden="true" />}
            {row.name}
          </span>
          <strong>{row.value}</strong>
        </div>
      ))}
      {note && <div className="chart-tooltip__estimate">{note}</div>}
    </div>
  );
}

export function ChartLegend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="chart-legend" aria-hidden="true">
      {items.map((item) => (
        <span key={item.label} className="chart-legend__item">
          <span className={`chart-legend__swatch ${item.dashed ? 'chart-legend__swatch--dashed' : ''}`} style={item.dashed ? { color: item.color } : { background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
