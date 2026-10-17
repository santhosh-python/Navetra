/**
 * Chart colours. SVG attributes cannot read CSS variables reliably, so these hex values mirror
 * src/styles/tokens.css. Change both together.
 */
export const CHART_COLORS = {
  text: '#191D23',
  muted: '#68717D',
  grid: '#E6E9ED',
  accent: '#D97732',
  critical: '#C83D43',
  warning: '#D99A25',
  safe: '#278568',
  info: '#3978B7',
  neutral: '#A7AFBA',
} as const;

export const RISK_CHART_COLORS = {
  critical: CHART_COLORS.critical,
  warning: CHART_COLORS.warning,
  safe: CHART_COLORS.safe,
} as const;

export const AXIS_TICK = { fill: CHART_COLORS.muted, fontSize: 12 } as const;
export const AXIS_LINE = { stroke: CHART_COLORS.grid } as const;
export const GRID_PROPS = { stroke: CHART_COLORS.grid, strokeDasharray: '3 3', vertical: false } as const;
