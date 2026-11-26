import type { AstroGlobal } from 'astro';
import { getEmDashCollection } from 'emdash';
import type { Schedule } from '../../emdash-env';
import type { SiteStatus } from './status';
import { accentOf, daysBetween, isClosed, isTrees, lastDay, milfordDay, pickPeriod, scheduleOrder, type Accent, type PeriodEntry as BaseEntry } from './schedule-dates';

export type PeriodEntry = BaseEntry<Schedule>;
export * from './schedule-dates';

export interface ScheduleContext {
  /** Milford calendar day the page was rendered for. */
  today: string;
  /** The period in force: the only source of the hours, banner and home page headline. */
  active: PeriodEntry;
  periods: PeriodEntry[];
  status: SiteStatus;
  accent: Accent;
  /** The stand is closed for this whole period. */
  closed: boolean;
  /** Tree lot open: Trees & wreaths nav item and product list. */
  treesOpen: boolean;
  /** The next tree lot, if one is scheduled after today. */
  nextTrees?: PeriodEntry;
  photoSet: 'stand' | 'trees';
  /** Trees & wreaths in the navigation: while the lot is open, for six weeks before, and for five days after (to say it has closed). */
  treesNav: boolean;
  /** Show the product list: while the lot is open and in the month before. */
  treesListed: boolean;
  /** The most recent tree lot, if it ended in the last two months. */
  endedTrees?: PeriodEntry;
  /** Set when a design-review preview (`?period=` / `?today=`) is in effect. */
  preview?: string;
}

/**
 * Design-review previews: `?period=trees` (slug or slug prefix) and `?today=2026-12-01`.
 * Honoured in `astro dev`, on preview builds (behind Cloudflare Access) and for
 * signed-in EmDash staff only; ignored for public visitors.
 */
function previewParams(Astro: AstroGlobal) {
  const allowed = import.meta.env.DEV || __ACCESS_SIGN_IN__ || !!Astro.locals.user;
  if (!allowed) return {};
  const period = Astro.url.searchParams.get('period')?.trim().toLowerCase() || undefined;
  const today = Astro.url.searchParams.get('today')?.trim();
  return { period, today: today && /^\d{4}-\d{2}-\d{2}$/.test(today) && !Number.isNaN(Date.parse(`${today}T12:00:00Z`)) ? today : undefined };
}

const cache = new WeakMap<Request, Promise<ScheduleContext>>();

/** Period context for this request (memoised, so layout and page share one query). */
export function getScheduleContext(Astro: AstroGlobal): Promise<ScheduleContext> {
  let pending = cache.get(Astro.request);
  if (!pending) {
    pending = build(Astro);
    cache.set(Astro.request, pending);
  }
  return pending;
}

async function build(Astro: AstroGlobal): Promise<ScheduleContext> {
  const { entries, error } = await getEmDashCollection('schedule', { limit: 200 });
  if (error) throw error;
  const toPeriod = (entry: (typeof entries)[number], start: string): PeriodEntry =>
    ({ slug: entry.id, data: entry.data as Schedule, edit: entry.edit as unknown as PeriodEntry['edit'], start });
  // A period with no first day isn't on the calendar yet, even if it's published.
  const periods = scheduleOrder(entries.flatMap((entry) => {
    const start = milfordDay(entry.data.start_date);
    return start ? [toPeriod(entry, start)] : [];
  }));
  const preview = previewParams(Astro);
  let today = preview.today ?? milfordDay(new Date())!;
  // Previewing a period: look at it from its own first day. One with no first day yet is shown as of today.
  const undated = entries.filter((entry) => !milfordDay(entry.data.start_date));
  const asked = preview.period
    ? periods.filter((period) => period.slug.startsWith(preview.period!)).at(-1)
      ?? undated.filter((entry) => entry.id.startsWith(preview.period!)).map((entry) => toPeriod(entry, today)).at(-1)
    : undefined;
  if (asked && !preview.today) today = asked.start;
  const active = asked ?? pickPeriod(periods, today);
  if (!active) throw new Error('Nothing is published in Schedule. Publish a period to bring the site back.');

  const line = active.data.status_text;
  const strip = active.data.banner_text?.trim();
  const treesOpen = isTrees(active.data);
  const closed = isClosed(active.data);
  const nextTrees = periods.find((period) => isTrees(period.data) && period.start > today);
  const endedTrees = periods.filter((period) => {
    const end = lastDay(period, periods);
    return isTrees(period.data) && !!end && end < today && daysBetween(end, today) <= 60;
  }).at(-1);
  const untilTrees = nextTrees ? daysBetween(today, nextTrees.start) : Infinity;
  // Closed just before the tree lot (Thanksgiving): its photos already.
  const treesNext = closed && !!nextTrees && periods[periods.indexOf(active) + 1] === nextTrees;
  return {
    today,
    active,
    periods,
    status: { line, edit: active.edit.status_text, ...(strip && strip !== line ? { strip, stripEdit: active.edit.banner_text } : {}) },
    accent: accentOf(active.data),
    closed,
    treesOpen,
    nextTrees,
    treesNav: treesOpen || untilTrees <= 45 || (!!endedTrees && daysBetween(lastDay(endedTrees, periods)!, today) <= 5),
    treesListed: treesOpen || untilTrees <= 30,
    endedTrees,
    photoSet: treesOpen || treesNext ? 'trees' : 'stand',
    preview: preview.period || preview.today ? `${preview.period ?? ''}${preview.today ? ` @ ${preview.today}` : ''}`.trim() : undefined,
  };
}
