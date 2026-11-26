/**
 * Pure period/date helpers (no EmDash imports) so they can be unit-tested
 * with plain Node: see tests/schedule.test.mjs.
 */

/** Every date decision is made on Milford's calendar, not the server's. */
export const TIME_ZONE = 'America/New_York';

/** The period fields these helpers read. */
export interface PeriodFields {
  title: string;
  /** What's happening: 'Closed', 'Trees & wreaths' or 'Open'. */
  kind?: string;
}

export const isTrees = (period?: PeriodFields) => period?.kind === 'Trees & wreaths';
export const isClosed = (period?: PeriodFields) => period?.kind === 'Closed';

/** Calendar day (YYYY-MM-DD) in Milford for a Date or an ISO string. */
export function milfordDay(value: Date | string | undefined | null): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export interface PeriodEntry<T extends PeriodFields = PeriodFields> {
  slug: string;
  data: T;
  edit: Record<string, Record<string, string> | undefined>;
  /** First day, on Milford's calendar. */
  start: string;
}

/** Green while the tree lot is open, otherwise red (`[data-accent=…]` in theme.css). */
export type Accent = 'red' | 'green';
export const accentOf = (period?: PeriodFields): Accent => (isTrees(period) ? 'green' : 'red');

/** The period in force on a day: the last one to have started, or the first one if none has. */
export const pickPeriod = <E extends PeriodEntry<any>>(periods: E[], day: string): E | undefined => {
  const ordered = scheduleOrder(periods);
  return ordered.filter((period) => period.start <= day).at(-1) ?? ordered[0];
};

/** Periods by first day. */
export const scheduleOrder = <E extends PeriodEntry<any>>(periods: E[]): E[] =>
  [...periods].sort((a, b) => a.start.localeCompare(b.start) || a.slug.localeCompare(b.slug));

/** A period's last day: the day before the next one starts. Undefined for the last period. */
export function lastDay(period: PeriodEntry<any>, all: PeriodEntry<any>[]): string | undefined {
  const next = scheduleOrder(all).find((other) => other.start > period.start)?.start;
  if (!next) return undefined;
  const d = new Date(`${next}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one calendar day to another (negative if `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Public name of a period: "Tree lot 2026" in the admin reads "Tree lot" on the site. */
export const publicTitle = (title: string) => title.replace(/\s+20\d\d$/, '');

/** "From Nov 27". */
export const datesLabel = (period: PeriodEntry<any>) =>
  `From ${new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(`${period.start}T12:00:00Z`))}`;

/**
 * Of seed-style entries ({ status, data.start_date }), the one in force on a Milford day:
 * published, dated, started on or before it. Drafts and undated periods are skipped.
 */
export function seedPeriodInForce<E extends { status?: string; data: { start_date?: unknown } }>(entries: E[], today: string): E | undefined {
  const day = (entry: E) => (entry.status === 'published' ? milfordDay(entry.data.start_date as string | undefined) : undefined);
  return entries
    .filter((entry) => { const d = day(entry); return !!d && d <= today; })
    .sort((x, y) => day(x)!.localeCompare(day(y)!))
    .at(-1);
}
