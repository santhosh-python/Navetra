/**
 * Date helpers. All dates are calendar dates stored as ISO strings (YYYY-MM-DD).
 * Arithmetic uses UTC so results do not depend on the user's timezone or daylight saving.
 */

/**
 * The "today" used by the synthetic demo dataset. Fixed so that every demo number is
 * reproducible. When the real backend exists it will supply the as-of date.
 */
export const DEMO_AS_OF_DATE = '2026-10-17';

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function toUtcDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(isoDate: string, days: number): string {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + Math.round(days));
  return date.toISOString().slice(0, 10);
}

/** Whole calendar days from `fromIsoDate` to `toIsoDate` (negative when `to` is earlier). */
export function diffDays(fromIsoDate: string, toIsoDate: string): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toUtcDate(toIsoDate).getTime() - toUtcDate(fromIsoDate).getTime()) / millisecondsPerDay);
}

const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

/** e.g. "23 Oct 2026" */
export function formatLongDate(isoDate: string | null): string {
  if (!isoDate || !isValidIsoDate(isoDate)) return '—';
  return longDateFormatter.format(toUtcDate(isoDate));
}

/** e.g. "23 Oct" */
export function formatShortDate(isoDate: string | null): string {
  if (!isoDate || !isValidIsoDate(isoDate)) return '—';
  return shortDateFormatter.format(toUtcDate(isoDate));
}

/** Calendar day difference phrased for people: "today", "in 3 days", "2 days ago". */
export function describeRelativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
