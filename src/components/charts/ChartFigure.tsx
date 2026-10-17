import type { ReactElement } from 'react';
import { ResponsiveContainer } from 'recharts';

interface ChartFigureProps {
  /** Describes the chart for screen readers. Charts are exposed as images with this label. */
  label: string;
  height?: 'default' | 'short' | 'tall';
  children: ReactElement;
}

/** Sizing wrapper: ResponsiveContainer needs a sized parent to draw into. */
export function ChartFigure({ label, height = 'default', children }: ChartFigureProps) {
  const className = height === 'short' ? 'chart-frame chart-frame--short' : height === 'tall' ? 'chart-frame chart-frame--tall' : 'chart-frame';
  return (
    <div className={className} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
