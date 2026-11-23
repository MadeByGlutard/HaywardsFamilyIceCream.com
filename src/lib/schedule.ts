import type { AstroGlobal } from 'astro';
import { getEmDashCollection } from 'emdash';
import { getBanner } from './site';
import type { Period, Visit } from '../../emdash-env';
import { accentOf, type Accent } from './schedule-dates';
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
  /** Trees & wreaths in the navigation: while the lot is open, for six weeks before, and for five days after (to say it has closed). */
  treesNav: boolean;
  /** Show the product list: while the lot is open and in the month before. */
  treesListed: boolean;
  /** The line is "Call for today's hours": make it dial. */
  call: boolean;
  /** The most recent tree lot, if it ended in the last two months. */
  endedTrees?: PeriodEntry;
  /** Open/closed from the period's optional "Open or closed" field; undefined when unknown or a Visit notice is in effect. */
  openState?: 'open' | 'closed';
  /** Set when a design-review preview (`?period=` / `?today=`) is in effect. */
  preview?: string;
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
  return { period, today: today && /^\d{4}-\d{2}-\d{2}$/.test(today) && !Number.isNaN(Date.parse(`${today}T12:00:00Z`)) ? today : undefined };
}

const cache = new WeakMap<Request, Promise<ScheduleContext>>();

/** Period context for this request (memoised, so layout and page share one query). */
export function getScheduleContext(Astro: AstroGlobal, place: Pick<Visit, 'hours' | 'notice'>): Promise<ScheduleContext> {
  let pending = cache.get(Astro.request);
  if (!pending) {
    pending = build(Astro, place);
    cache.set(Astro.request, pending);
  }
  return pending;
}

async function build(Astro: AstroGlobal, place: Pick<Visit, 'hours' | 'notice'>): Promise<ScheduleContext> {
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
  // A location notice (a snow day) takes the bar, then the Site settings banner staff type by
  // hand, then the period's own. Previews of another period or date show that period's.
  const notice = place.notice?.trim() || undefined;
  const typed = preview.period || preview.today ? undefined : banner.text;
  const strip = notice ?? typed ?? active?.data.banner_text?.trim();
  const status: SiteStatus = { ...base, strip: strip && (notice || strip !== base.line) ? strip : undefined, stripEdit: notice ? undefined : typed ? banner.edit : active?.edit.banner_text };

  const treesOpen = !!active?.data.show_trees_nav;
  // Measured from the later of today and the active period's first day, so a
  // previewed period (?period=winter) doesn't count a tree lot that is before it.
  const from = active?.start && active.start > today ? active.start : today;
  const nextTrees = ordered.find((s) => !!s.data.show_trees_nav && !!s.start && s.start > from);
  const openState = status.source === 'period' && active?.data.open_state ? (active.data.open_state === 'Closed' ? ('closed' as const) : ('open' as const)) : undefined;
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
    call: stale && !notice,
    treesOpen,
    nextTrees,
    treesNav: treesOpen || untilTrees <= 45 || (!!endedTrees && daysBetween(effectiveEnd(endedTrees, ordered)!, today) <= 5),
    treesListed: treesOpen || untilTrees <= 30,
    endedTrees,
    photoSet: active?.data.photo_set === 'Tree lot' ? 'trees' : 'stand',
    openState,
    preview: preview.period || preview.today ? `${preview.period ?? ''}${preview.today ? ` @ ${preview.today}` : ''}`.trim() : undefined,
  };
}
