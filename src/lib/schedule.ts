import type { AstroGlobal } from 'astro';
import { getEmDashCollection } from 'emdash';
import type { Period, Visit } from '../../emdash-env';
import { accentOf, type Accent } from './schedule-dates';
import { getBanner } from './site';
import { locationStatus, type SiteStatus } from './status';
import { daysBetween, effectiveEnd, isStaleClosure, milfordDay, pickPeriod, publicTitle, scheduleOrder, type PeriodEntry as BaseEntry } from './schedule-dates';

export type PeriodEntry = BaseEntry<Period & { show_trees_nav?: boolean | number }>;
export * from './schedule-dates';

export interface ScheduleContext {
  /** Milford calendar day the page was rendered for. */
  today: string;
  active?: PeriodEntry;
  periods: PeriodEntry[];
  status: SiteStatus;
  accent: Accent;
  /** Tree lot open: Trees & wreaths nav item and product list. */
  treesOpen: boolean;
  /** Next period that opens the tree lot, if one is scheduled after today. */
  nextTrees?: PeriodEntry;
  photoSet: 'stand' | 'trees';
  /** Trees & wreaths in the navigation: while the lot is open and for two weeks before. */
  treesNav: boolean;
  /** Show the product list: while the lot is open and in the month before. */
  treesListed: boolean;
  /** Today's opening and closing times ("11:00"), when known and the stand is not closed. */
  hours?: {
    opens: string;
    closes: string;
    /** Tomorrow's times, or what starts tomorrow instead ("Winter break"). */
    next?: { opens: string; closes: string } | { starts: string };
    /** A later summer closing that staff haven't dated yet: don't claim "closed" before it. */
    late?: string;
  };
  /** The most recent tree lot, if it ended in the last two months. */
  endedTrees?: PeriodEntry;
  /** The active period's last day, allowing for the one that follows it. */
  lastDay?: string;
  /** Open/closed from the period's optional "Open or closed" field; undefined when unknown or a Visit notice is in effect. */
  openState?: 'open' | 'closed';
  /** Set when a design-review preview (`?period=` / `?today=`) is in effect. */
  preview?: string;
  /** Calendar day this page's hours are true for; unset when a period is previewed without a date. */
  hoursDay?: string;
}

/**
 * Design-review previews: `?period=trees` (slug or slug prefix, or `none`
 * for no period) and `?today=2026-12-01`. Honoured in `astro dev` and for
 * signed-in EmDash staff only; ignored for public visitors.
 */
function previewParams(Astro: AstroGlobal) {
  const allowed = import.meta.env.DEV || !!Astro.locals.user;
  if (!allowed) return {};
  const period = Astro.url.searchParams.get('period')?.trim().toLowerCase() || undefined;
  const today = Astro.url.searchParams.get('today')?.trim();
  return { period, today: today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : undefined };
}

const cache = new WeakMap<Request, Promise<ScheduleContext>>();

/** Period context for this request (memoised, so layout and page share one query). */
export function getScheduleContext(Astro: AstroGlobal, place: Pick<Visit, 'hours' | 'notice' | 'opens_at' | 'closes_at'>): Promise<ScheduleContext> {
  let pending = cache.get(Astro.request);
  if (!pending) {
    pending = build(Astro, place);
    cache.set(Astro.request, pending);
  }
  return pending;
}

async function build(Astro: AstroGlobal, place: Pick<Visit, 'hours' | 'notice' | 'opens_at' | 'closes_at'>): Promise<ScheduleContext> {
  const [{ entries, error }, banner] = await Promise.all([getEmDashCollection('periods', { limit: 100 }), getBanner()]);
  if (error) console.warn('Schedule periods could not be loaded; using Visit information.', error);
  const periods: PeriodEntry[] = (entries ?? []).map((e) => ({
    slug: e.id,
    data: e.data as Period,
    edit: e.edit as unknown as PeriodEntry['edit'],
    start: milfordDay(e.data.start_date),
    end: milfordDay(e.data.end_date),
  }));
  const ordered = scheduleOrder(periods);
  const preview = previewParams(Astro);
  let today = preview.today ?? milfordDay(new Date())!;

  let active: PeriodEntry | undefined;
  if (preview.period === 'none') active = undefined;
  else if (preview.period) {
    active = ordered.filter((s) => s.slug === preview.period || s.slug.startsWith(`${preview.period}-`) || s.slug.startsWith(preview.period!)).at(-1);
  } else active = pickPeriod(ordered, today);
  // Previewing a period without ?today: look at it from its own first day, so
  // the Visit schedule and "next tree lot" read as they will on that day.
  if (preview.period && !preview.today && active?.start && active.start > today) today = active.start;

  // Nobody followed up on an open-ended closure: stop claiming it.
  const stale = !!active && isStaleClosure(active, today);
  if (stale) active = undefined;

  // A location notice (e.g. a weather closure) beats the period's status line;
  // the period's status beats the everyday opening statement.
  const fallback: SiteStatus = stale && !place.notice?.trim() ? { line: 'Call for today’s hours', source: 'notice' } : locationStatus(place);
  const periodLine = active?.data.status_text?.trim();
  const base: SiteStatus = fallback.source === 'notice' || !periodLine ? fallback : { line: periodLine, source: 'period', edit: active!.edit.status_text };
  // The Site settings banner is what staff type by hand, so it beats the period's own
  // notice. Previews of another period or date show that period's notice instead.
  const typed = preview.period || preview.today ? undefined : banner.text;
  const strip = typed ?? active?.data.banner_text?.trim();
  const status: SiteStatus = { ...base, strip: strip && strip !== base.line ? strip : undefined, stripEdit: typed ? banner.edit : active?.edit.banner_text };

  const treesOpen = !!active?.data.show_trees_nav;
  // Measured from the later of today and the active period's first day, so a
  // previewed period (?period=winter) doesn't count a tree lot that is before it.
  const from = active?.start && active.start > today ? active.start : today;
  const nextTrees = ordered.find((s) => !!s.data.show_trees_nav && !!s.start && s.start > from);
  const openState = status.source === 'period' && active?.data.open_state ? (active.data.open_state === 'Closed' ? ('closed' as const) : ('open' as const)) : undefined;
  // Today's times for "Open now": the period's own, or the everyday ones when no period sets the line.
  const times = status.source === 'period' ? active?.data : status.source === 'hours' ? place : undefined;
  const clock = /^([01]\d|2[0-3]):[0-5]\d$/;
  const timesOf = (data?: { opens_at?: string; closes_at?: string }) => data?.opens_at && data.closes_at && clock.test(data.opens_at) && clock.test(data.closes_at) ? { opens: data.opens_at, closes: data.closes_at } : undefined;
  const day = new Date(`${today}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  const following = active && !active.start ? active : pickPeriod(ordered, day.toISOString().slice(0, 10));
  const todayTimes = openState === 'closed' ? undefined : timesOf(times);
  const nextTimes = following?.data.open_state === 'Closed' ? undefined : timesOf(following ? following.data : place);
  const summer = today.slice(5) >= '05-15' && today.slice(5) <= '09-15' ? ordered.find((s) => !s.start && s !== active && (timesOf(s.data)?.closes ?? '') > (todayTimes?.closes ?? '99')) : undefined;
  const hours = todayTimes && {
    ...todayTimes,
    next: nextTimes ?? (following ? { starts: publicTitle(following.data.title) } : undefined),
    late: summer && timesOf(summer.data)?.closes,
  };
  const endedTrees = ordered.filter((s) => {
    const end = effectiveEnd(s, ordered);
    return !!s.data.show_trees_nav && !!end && end < today && daysBetween(end, today) <= 60;
  }).at(-1);
  const untilTrees = nextTrees?.start ? daysBetween(today, nextTrees.start) : Infinity;
  return {
    today,
    active,
    periods: ordered,
    status,
    accent: accentOf(active?.data),
    treesOpen,
    nextTrees,
    treesNav: treesOpen || untilTrees <= 14,
    treesListed: treesOpen || untilTrees <= 30,
    hours,
    hoursDay: preview.period && !preview.today ? undefined : today,
    endedTrees,
    lastDay: active && effectiveEnd(active, ordered),
    photoSet: active?.data.photo_set === 'Tree lot' ? 'trees' : 'stand',
    openState,
    preview: preview.period || preview.today ? `${preview.period ?? ''}${preview.today ? ` @ ${preview.today}` : ''}`.trim() : undefined,
  };
}
