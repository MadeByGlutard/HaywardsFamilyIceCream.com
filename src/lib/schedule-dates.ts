/**
 * Pure period/date helpers (no EmDash imports) so they can be unit-tested
 * with plain Node: see tests/schedule.test.mjs.
 */

/** Every date decision is made on Milford's calendar, not the server's. */
export const TIME_ZONE = 'America/New_York';

/** The period fields these helpers read. */
export interface PeriodFields {
  title: string;
  dates_label?: string;
  accent?: string;
  show_trees_nav?: boolean | number;
}

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
  start?: string;
  end?: string;
}

/** Accent token names understood by theme.css (`[data-accent=…]`). Anything else falls back to red. */
const ACCENTS = ['red', 'green'] as const;
export type Accent = (typeof ACCENTS)[number];
export const accentOf = (period?: PeriodFields): Accent => (ACCENTS as readonly string[]).includes(period?.accent ?? '') ? (period!.accent as Accent) : 'red';

/** Is `day` inside the period? Schedule periods without a first day never start on their own. */
export const isActive = (period: PeriodEntry<any>, day: string) => !!period.start && period.start <= day && (!period.end || day <= period.end);

/**
 * Choose the active period for a day. When periods overlap (an open-ended
 * winter break and next spring's period), the one that started most recently wins.
 */
export function pickPeriod<E extends PeriodEntry<any>>(periods: E[], day: string): E | undefined {
  return periods.filter((s) => isActive(s, day)).sort((a, b) => (b.start! > a.start! ? 1 : b.start! < a.start! ? -1 : 0))[0];
}

/** Schedule periods in schedule order: dated ones by first day, undated ones last (by slug, so the order is stable). */
export const scheduleOrder = <E extends PeriodEntry<any>>(periods: E[]): E[] =>
  [...periods].sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999') || a.slug.localeCompare(b.slug));

/** Last day a period is in force for the schedule, allowing for a later period to cut an open end short. */
export function effectiveEnd(period: PeriodEntry<any>, all: PeriodEntry<any>[]): string | undefined {
  if (period.end || !period.start) return period.end;
  const next = all.filter((s) => s.start && s.start > period.start!).map((s) => s.start!).sort()[0];
  if (!next) return undefined;
  const d = new Date(`${next}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Whole days from one calendar day to another (negative if `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Days an open-ended closure is trusted before the site stops claiming it. */
export const STALE_CLOSURE_DAYS = 60;

/**
 * An open-ended closed period nobody has followed up on. Past reopenings ran to
 * mid-February, so after 60 days the site says "Call for today's hours" instead
 * of claiming the stand is still closed.
 */
export const isStaleClosure = (period: PeriodEntry<any>, today: string) =>
  period.data.open_state === 'Closed' && !!period.start && !period.end && daysBetween(period.start, today) > STALE_CLOSURE_DAYS;

/** Public name of a period: "Tree lot 2026" in the admin reads "Tree lot" on the site. */
export const publicTitle = (title: string) => title.replace(/\s+20\d\d$/, '');

const monthDay = (day: string, withMonth = true) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: withMonth ? 'short' : undefined, day: 'numeric' }).format(new Date(`${day}T12:00:00Z`));

/** "Nov 22 – 26", "Nov 27 – Dec 24", "From Dec 25", or the editor's own label. */
export function datesLabel(period: PeriodEntry<any>): string {
  if (period.data.dates_label?.trim()) return period.data.dates_label.trim();
  if (!period.start) return 'Dates to be announced';
  const end = period.end;
  if (!end) return `From ${monthDay(period.start)}`;
  if (end === period.start) return monthDay(period.start);
  const sameMonth = end.slice(0, 7) === period.start.slice(0, 7);
  return `${monthDay(period.start)} – ${monthDay(end, !sameMonth)}`;
}

