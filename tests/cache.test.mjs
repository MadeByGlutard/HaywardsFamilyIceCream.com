// Route-cache policy: tags from EmDash hints, TTL capped at New York midnight.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BROWSER_CACHE_CONTROL, FALLBACK_CACHE_CONTROL, cachePage, secondsUntilMidnight } from '../src/lib/cache.ts';

test('TTL runs to the next midnight in America/New_York', () => {
  // 19:00 EST -> 5 hours
  assert.equal(secondsUntilMidnight(new Date('2026-11-23T00:00:00Z')), 5 * 3600);
  // 23:59:30 EDT -> 30 seconds
  assert.equal(secondsUntilMidnight(new Date('2026-07-02T03:59:30Z')), 30);
  // Exactly midnight -> a full day
  assert.equal(secondsUntilMidnight(new Date('2026-11-23T05:00:00Z')), 24 * 3600);
});

test('DST days are 23 and 25 hours long', () => {
  // 2026-03-08 (spring forward): midnight EST to next midnight EDT
  assert.equal(secondsUntilMidnight(new Date('2026-03-08T05:00:00Z')), 23 * 3600);
  // 2026-11-01 (fall back): midnight EDT to next midnight EST
  assert.equal(secondsUntilMidnight(new Date('2026-11-01T04:00:00Z')), 25 * 3600);
});

function fakeCache(enabled) {
  const calls = [];
  return { enabled, calls, set: options => calls.push(options) };
}

test('with a cache provider, hints become tags and maxAge is set', () => {
  const cache = fakeCache(true);
  const headers = new Headers();
  cachePage(cache, headers, [{ tags: ['settings', '01ABC'] }, { tags: ['flavors'] }], 1234);
  assert.deepEqual(cache.calls, [{ tags: ['settings', '01ABC'] }, { tags: ['flavors'] }, { maxAge: 1234 }]);
  assert.equal(headers.get('Cache-Control'), BROWSER_CACHE_CONTROL);
});

test('without a cache provider (astro dev), falls back to a short Cache-Control', () => {
  const cache = fakeCache(false);
  const headers = new Headers();
  cachePage(cache, headers, [{ tags: ['settings'] }], 1234);
  assert.deepEqual(cache.calls, []);
  assert.equal(headers.get('Cache-Control'), FALLBACK_CACHE_CONTROL);
});

test('the homepage registers every collection EmDash purges on publish', async () => {
  const content = await readFile(new URL('../src/lib/content.ts', import.meta.url), 'utf8');
  const page = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  // EmDash's write routes invalidate [collection, entryId]; collection queries
  // tag the collection name, entry queries the entry ID.
  for (const collection of ['settings', 'categories', 'flavors']) assert.match(content, new RegExp(`'${collection}'`));
  assert.match(content, /categories\.cacheHint, flavors\.cacheHint/);
  assert.match(page, /cachePage\(Astro\.cache, Astro\.response\.headers, \[settings\.cacheHint, \.\.\.cacheHints\], secondsUntilMidnight\(\)\)/);
  const config = await readFile(new URL('../astro.config.mjs', import.meta.url), 'utf8');
  assert.match(config, /cache: \{ provider: cacheCloudflare\(\) \}/);
  const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(wrangler, /"cache": \{ "enabled": true \}/);
});
