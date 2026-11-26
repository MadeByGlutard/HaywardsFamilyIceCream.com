/**
 * Caching for public pages. See README "Caching".
 *
 * Production: Astro route caching with the Cloudflare Workers cache provider
 * (`cacheCloudflare()` in astro.config.mjs). Pages register EmDash's cache
 * hints as Cache-Tags; EmDash's admin write routes call
 * `cache.invalidate({ tags: [collection, id] })` on save/publish/unpublish/
 * delete/restore, which purges every page that read that collection or entry.
 * The homepage TTL is capped at the next midnight in America/New_York so the
 * daily gallery pick is never served a day late.
 *
 * Where route caching is off (astro dev uses a no-op cache), fall back to a
 * plain short-lived Cache-Control header.
 */
/** Same zone as the gallery's daily pick (src/lib/gallery.ts). */
const TIME_ZONE = 'America/New_York';

/** Fallback when no cache provider is active: edge 5 min, browser 1 min. */
export const FALLBACK_CACHE_CONTROL = 'public, max-age=60, s-maxage=300';

/** Browsers always revalidate, so a purge at the edge is visible immediately. */
export const BROWSER_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

function wallClock(instant: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(new Date(instant))
      .map(p => [p.type, Number(p.value)]),
  );
  return parts as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

/** Whole seconds from `now` until the next 00:00 in `timeZone` (DST-safe), at least 1. */
export function secondsUntilMidnight(now: Date = new Date(), timeZone = TIME_ZONE): number {
  const t = wallClock(now.getTime(), timeZone);
  // Tomorrow's date at 00:00, first as if it were UTC, then corrected by the
  // zone's UTC offset at that moment (tried at both candidate offsets).
  const tomorrowUtc = Date.UTC(t.year, t.month - 1, t.day + 1);
  let midnight = tomorrowUtc;
  for (let i = 0; i < 2; i++) {
    const w = wallClock(midnight, timeZone);
    const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
    midnight += tomorrowUtc - asUtc;
  }
  return Math.max(1, Math.ceil((midnight - now.getTime()) / 1000));
}

interface CacheHint {
  tags?: string[];
  lastModified?: Date;
}

/** Every collection the public pages read. Saving any entry in one purges them. */
export const CONTENT_TAGS = ['catalog_categories', 'catalog_flavors', 'catalog_items', 'schedule', 'store', 'site_pages', 'jobs', 'posts', 'emdash:settings', 'emdash:menu:primary', 'emdash:menu:flavors', 'emdash:menu:sundaes', 'emdash:menu:food', 'emdash:menu:trees'];

interface RouteCache {
  enabled: boolean;
  set(options: { maxAge?: number; tags?: string[]; lastModified?: Date }): void;
}

/**
 * Cache a public page until its content changes (purged by tag) or, at the
 * latest, until `maxAge` seconds.
 */
export function cachePage(
  cache: RouteCache | undefined,
  headers: Headers,
  hints: CacheHint[],
  maxAge: number,
): void {
  if (!cache?.enabled) {
    headers.set('Cache-Control', FALLBACK_CACHE_CONTROL);
    return;
  }
  for (const hint of hints) cache.set(hint);
  cache.set({ maxAge });
  headers.set('Cache-Control', BROWSER_CACHE_CONTROL);
}

interface PageContext {
  cache: RouteCache | undefined;
  response: { headers: Headers };
  url: URL;
}

/**
 * Cache a content page until something it might show is published, or New York
 * midnight, when hours and periods can change. Staff previews are never cached.
 */
export function cacheContentPage({ cache, response, url }: PageContext): void {
  if (url.searchParams.has('period') || url.searchParams.has('today')) {
    response.headers.set('Cache-Control', 'private, no-store');
    return;
  }
  cachePage(cache, response.headers, [{ tags: CONTENT_TAGS }], secondsUntilMidnight());
}
