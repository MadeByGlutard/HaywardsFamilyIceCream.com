import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { milfordDay, pickPeriod, scheduleOrder, datesLabel, lastDay, accentOf, isClosed, isTrees, daysBetween, publicTitle } from '../src/lib/schedule-dates.ts';
import { byName, sharedOptions } from '../src/lib/catalog-text.ts';

const seed = JSON.parse(await readFile(new URL('../seed/seed.json', import.meta.url), 'utf8'));
const periods = seed.content.schedule.filter((e) => e.status === 'published').map((e) => ({ slug: e.slug, data: e.data, edit: {}, start: milfordDay(e.data.start_date) }));
const at = (day) => pickPeriod(scheduleOrder(periods), day)?.slug;

test('seeded periods are dated on Milford’s calendar', () => {
	assert.equal(milfordDay('2026-11-27T00:00:00-05:00'), '2026-11-27');
	// 11:30pm on Christmas Eve in Milford is still the 24th, although UTC has moved on.
	assert.equal(milfordDay('2026-12-25T04:30:00Z'), '2026-12-24');
});

test('there is always a period, and each runs until the next one starts', () => {
	assert.equal(at('2025-01-01'), 'ice-cream-2026', 'before the first period');
	assert.equal(at('2026-11-21'), 'ice-cream-2026');
	assert.equal(at('2026-11-22'), 'thanksgiving-2026');
	assert.equal(at('2026-11-26'), 'thanksgiving-2026');
	assert.equal(at('2026-11-27'), 'trees-2026');
	assert.equal(at('2026-12-24'), 'trees-2026');
	assert.equal(at('2026-12-25'), 'winter-2026');
	assert.equal(at('2027-06-01'), 'winter-2026', 'until staff schedule the next one');
	const trees = periods.find((s) => s.slug === 'trees-2026');
	assert.equal(lastDay(trees, periods), '2026-12-24');
	assert.equal(lastDay(periods.find((s) => s.slug === 'winter-2026'), periods), undefined);
	assert.equal(pickPeriod([], '2026-12-25'), undefined);
});

test('a period is complete: nothing else supplies its hours or headline', () => {
	const fields = seed.collections.find((c) => c.slug === 'schedule').fields;
	const required = fields.filter((f) => f.required).map((f) => f.slug);
	assert.deepEqual(fields.filter((f) => !f.required).map((f) => f.slug), ['banner_text']);
	for (const p of seed.content.schedule) for (const slug of required) assert.ok(p.data[slug] || (p.status === 'draft' && slug === 'start_date'), `${p.slug}.${slug}`);
	assert.ok(!seed.collections.find((c) => c.slug === 'store').fields.some((f) => /hours|banner/.test(f.slug)));
	assert.ok(!seed.content.site_pages.find((p) => p.slug === 'home').data.headline);
});

test('schedule labels and accents', () => {
	const bySlug = Object.fromEntries(periods.map((s) => [s.slug, s]));
	assert.equal(datesLabel(bySlug['trees-2026']), 'From Nov 27');
	assert.equal(accentOf(bySlug['trees-2026'].data), 'green');
	assert.equal(accentOf(bySlug['winter-2026'].data), 'red');
	assert.ok(isTrees(bySlug['trees-2026'].data) && isClosed(bySlug['thanksgiving-2026'].data));
	assert.deepEqual(scheduleOrder(periods).map((s) => s.slug), ['ice-cream-2026', 'thanksgiving-2026', 'trees-2026', 'winter-2026']);
	assert.equal(daysBetween('2026-12-21', '2027-01-02'), 12);
});

test('seed content invents no closing times, prices or dates', () => {
	// Confirmed by the owner: 8pm standard, 9pm in summer. The tree lot's closing
	// time is not confirmed for 2026.
	const text = JSON.stringify(seed.content.schedule) + JSON.stringify(seed.content.catalog_items) + JSON.stringify(seed.content.catalog_flavors);
	assert.doesNotMatch(text, /\$\s?\d/, 'no prices');
	const closings = [...text.matchAll(/\b(1[0-2]|[1-9])(:\d\d)?\s?pm\b/gi)].map((m) => m[0].toLowerCase());
	assert.deepEqual([...new Set(closings)].filter((t) => !['8pm', '9pm'].includes(t)), [], 'only confirmed closing times (8pm, 9pm); leave others out');
	assert.doesNotMatch(text, /\[[^\]"]*(confirm|time|date)[^\]"]*\]/, 'no draft placeholders in public copy');
	assert.equal(seed.content.schedule.find((p) => p.slug === 'ice-cream-2026').data.status_text, 'Open daily, 11am to 8pm');
	const summer = seed.content.schedule.find((p) => p.slug === 'summer-2027');
	assert.equal(summer.status, 'draft', 'summer hours have no set dates: staff date and publish them');
	assert.ok(!summer.data.start_date);
	assert.equal(summer.data.status_text, 'Open daily, 11am to 9pm');
});

test('the forms stay short, with no prices', () => {
	// Store info and Pages also hold the text that used to be written into the templates (Nov 2026).
	const most = { schedule: 7, catalog_flavors: 6, catalog_items: 3, catalog_categories: 3, store: 8, jobs: 3, site_pages: 10, posts: 5 };
	assert.deepEqual(seed.collections.map((c) => c.slug), Object.keys(most));
	for (const c of seed.collections) {
		assert.ok(c.fields.length <= most[c.slug], `${c.slug} has ${c.fields.length} fields`);
		assert.ok(!c.fields.some((f) => /price/.test(f.slug)));
	}
});

test('public names drop the admin year', () => {
	assert.equal(publicTitle('Tree lot 2026'), 'Tree lot');
	assert.equal(publicTitle('Ice cream season'), 'Ice cream season');
});

test('every flavor and menu item is in a category, and categories are on a menu', async () => {
	const ids = new Set(seed.content.catalog_categories.map((c) => `$ref:${c.id}`));
	for (const entry of [...seed.content.catalog_flavors, ...seed.content.catalog_items]) assert.ok(ids.has(entry.data.category), entry.slug);
	for (const collection of ['catalog_flavors', 'catalog_items']) assert.ok(seed.collections.find((c) => c.slug === collection).fields.find((f) => f.slug === 'category').required);
	const onMenus = seed.menus.filter((menu) => menu.name !== 'primary').flatMap((menu) => menu.items.map((item) => item.ref));
	assert.deepEqual([...onMenus].sort(), seed.content.catalog_categories.map((c) => c.id).sort(), 'each category is on one menu');
	for (const page of ['food', 'sundaes']) {
		const source = await readFile(new URL(`../src/pages/${page}.astro`, import.meta.url), 'utf8');
		for (const [, slug] of source.match(/columns=\{(.*)\}/)[1].matchAll(/'([^']+)'/g)) assert.ok(seed.content.catalog_categories.some((c) => c.slug === slug), slug);
	}
	const squareIds = JSON.parse(await readFile(new URL('../seed/square-ids.json', import.meta.url), 'utf8'));
	assert.equal(Object.keys(squareIds).length, 51);
	for (const slug of Object.keys(squareIds)) assert.ok(seed.content.catalog_items.some((item) => item.slug === slug), slug);
	assert.ok(!JSON.stringify(seed).includes('square_id'), 'Square IDs stay out of the content');
});

test('the navigation links to every page', () => {
	const primary = seed.menus.find((menu) => menu.name === 'primary');
	assert.deepEqual(primary.items.map((item) => item.ref).sort(), seed.content.site_pages.map((p) => p.id).sort(), 'every page is in Main navigation');
	const footerOnly = seed.content.site_pages.filter((p) => !p.data.top_menu).map((p) => p.slug).sort();
	assert.deepEqual(footerOnly, ['blog', 'jobs'], 'Join our team and Blog are in the footer only');
	for (const item of primary.items) assert.equal(item.collection, 'site_pages');
});

test('jobs make no claims about pay, ages or hours', () => {
	const text = JSON.stringify(seed.content.jobs);
	assert.doesNotMatch(text, /\$|\bper hour\b|\bage\b|\b1[4-8]\b|\b\d{1,2}(am|pm)\b/i);
	for (const job of seed.content.jobs) assert.equal(job.data.hiring, false, `${job.slug}: only staff say when they're hiring`);
});

test('menu helpers', () => {
	assert.equal(sharedOptions(['24-inch', '24-inch', '24-inch', undefined]), '24-inch');
	assert.deepEqual(byName(['Snickers', 'S’mores', 'Strawberry'].map((name) => ({ data: { name } }))).map((e) => e.data.name), ['S’mores', 'Snickers', 'Strawberry']);
});
