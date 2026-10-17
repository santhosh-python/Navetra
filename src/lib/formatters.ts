/**
 * Display formatting only. No business rules live here.
 * Numbers use tabular numerals in CSS (see styles/utilities.css).
 */

const integerFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const decimalFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const percentFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, signDisplay: 'exceptZero' });

export function formatInteger(value: number): string {
  return integerFormatter.format(Math.round(value));
}

export function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Signed percentage, e.g. "+20%", "-15%", "0%". */
export function formatSignedPercent(value: number): string {
  return `${percentFormatter.format(Math.round(value))}%`;
}

/**
 * Whole days of stock remaining, rounded down so the number agrees with the
 * stock-out date (which is as-of date + floor(days)). Returns "No use recorded" when usage is zero.
 */
export function formatWholeDaysRemaining(days: number | null): string {
  if (days === null) return 'No use recorded';
  const wholeDays = Math.floor(days);
  return wholeDays === 1 ? '1 day' : `${integerFormatter.format(wholeDays)} days`;
}

/** Quantity with its unit, e.g. "120 sachets". Units are used exactly as stored. */
export function formatQuantity(quantity: number, unit: string): string {
  const rounded = Number.isInteger(quantity) ? integerFormatter.format(quantity) : decimalFormatter.format(quantity);
  return `${rounded} ${unit}`;
}

/** Daily rate, e.g. "18 sachets/day". */
export function formatDailyRate(dailyUsage: number, unit: string): string {
  const rounded = Number.isInteger(dailyUsage) ? integerFormatter.format(dailyUsage) : decimalFormatter.format(dailyUsage);
  return `${rounded} ${unit}/day`;
}

/** Compact currency for KPI cards, e.g. "₹1.2L" or "₹45,300". */
export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 100000) {
    return `₹${decimalFormatter.format(value / 100000)}L`;
  }
  return formatCurrency(value);
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${integerFormatter.format(count)} ${count === 1 ? singular : plural}`;
}
