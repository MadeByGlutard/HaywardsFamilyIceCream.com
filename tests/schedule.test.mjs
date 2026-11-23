import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { milfordDay, pickPeriod, scheduleOrder, datesLabel, effectiveEnd, accentOf, isStaleClosure, daysBetween, publicTitle } from '../src/lib/schedule-dates.ts';

const seed = JSON.parse(await readFile(new URL('../seed/seed.json', import.meta.url), 'utf8'));
const periods = seed.content.periods.map((e) => ({ slug: e.slug, data: e.data, edit: {}, start: milfordDay(e.data.start_date), end: milfordDay(e.data.end_date) }));
const at = (day) => pickPeriod(scheduleOrder(periods), day)?.slug;

test('seeded periods are dated on Milford’s calendar', () => {
	assert.equal(milfordDay('2026-11-27T00:00:00-05:00'), '2026-11-27');
	// 11:30pm on Christmas Eve in Milford is still the 24th, although UTC has moved on.
	assert.equal(milfordDay('2026-12-25T04:30:00Z'), '2026-12-24');
});

test('active period follows the calendar', () => {
	assert.equal(at('2026-11-21'), undefined, 'before any period: fall back to Visit information');
	assert.equal(at('2026-11-22'), 'thanksgiving-2026');
	assert.equal(at('2026-11-26'), 'thanksgiving-2026');
	assert.equal(at('2026-11-27'), 'trees-2026');
	assert.equal(at('2026-12-24'), 'trees-2026', 'the lot runs until the winter break starts');
	assert.equal(at('2026-12-25'), 'winter-2026');
	assert.equal(at('2027-06-01'), 'winter-2026', 'ice cream season has no first day yet, so the winter break continues');
	assert.notEqual(at('2027-07-04'), 'summer-2027', 'summer hours have no set dates until staff give them');
});

test('a later period cuts an open-ended one short', () => {
	const dated = periods.map((s) => (s.slug === 'ice-cream-2027' ? { ...s, start: '2027-04-15' } : s));
	assert.equal(pickPeriod(scheduleOrder(dated), '2027-04-15').slug, 'ice-cream-2027');
	assert.equal(effectiveEnd(dated.find((s) => s.slug === 'winter-2026'), dated), '2027-04-14');
});

test('schedule labels and accents', () => {
	const bySlug = Object.fromEntries(periods.map((s) => [s.slug, s]));
	assert.equal(datesLabel(bySlug['thanksgiving-2026']), 'Nov 22 – 26');
	assert.equal(datesLabel(bySlug['trees-2026']), 'From Nov 27');
	assert.equal(datesLabel({ ...bySlug['trees-2026'], end: '2026-12-24', data: { title: 'x' } }), 'Nov 27 – Dec 24');
	assert.equal(datesLabel(bySlug['winter-2026']), 'From Dec 25');
	assert.equal(datesLabel(bySlug['summer-2027']), 'Summer months');
	assert.equal(accentOf(bySlug['trees-2026'].data), 'green');
	assert.equal(accentOf({ title: 'x', accent: 'purple' }), 'red', 'unknown token falls back to red');
	assert.deepEqual(scheduleOrder(periods).map((s) => s.slug), ['thanksgiving-2026', 'trees-2026', 'winter-2026', 'ice-cream-2027', 'summer-2027']);
});

test('seed content invents no closing times, prices or dates', () => {
	// Confirmed by the owner: 8pm standard, 9pm in summer. The tree lot's closing
	// time is not confirmed for 2026. Staff notes may quote past hours.
	const text = JSON.stringify(seed.content.periods.map((e) => ({ ...e.data, notes: undefined }))) + JSON.stringify(seed.content.products);
	assert.doesNotMatch(text, /\$\s?\d/, 'no prices');
	const closings = [...text.matchAll(/\b(1[0-2]|[1-9])(:\d\d)?\s?pm\b/gi)].map((m) => m[0].toLowerCase());
	assert.deepEqual([...new Set(closings)].filter((t) => !['8pm', '9pm'].includes(t)), [], 'only confirmed closing times (8pm, 9pm); leave others out');
	assert.doesNotMatch(text, /\[[^\]"]*(confirm|time|date)[^\]"]*\]/, 'no draft placeholders in public copy');
	assert.equal(seed.content.visit[0].data.hours, 'Open daily, 11am to 8pm. Until 9pm in summer');
	for (const p of seed.content.products) assert.ok(!('price' in p.data), `${p.slug} has no price field`);
});

test('new collections are additive and Square-ready', () => {
	const products = seed.collections.find((c) => c.slug === 'products');
	const periodsCol = seed.collections.find((c) => c.slug === 'periods');
	assert.ok(products && periodsCol);
	assert.ok(products.fields.find((f) => f.slug === 'square_id' && !f.required));
	assert.ok(!products.fields.some((f) => /price/.test(f.slug)));
	for (const f of [...products.fields, ...periodsCol.fields]) if (f.slug !== 'title' && f.slug !== 'category') assert.ok(!f.required, `${f.slug} should be optional`);
});

test('an open-ended closure nobody follows up on is not claimed forever', () => {
	const winter = periods.find((s) => s.slug === 'winter-2026');
	assert.equal(isStaleClosure(winter, '2027-01-02'), false);
	assert.equal(isStaleClosure(winter, '2027-02-15'), false, 'past reopenings ran to mid-February');
	assert.equal(isStaleClosure(winter, '2027-07-04'), true);
	assert.equal(isStaleClosure({ ...winter, end: '2027-12-31' }, '2027-07-04'), false, 'a dated closure is trusted');
	assert.equal(daysBetween('2026-12-21', '2027-01-02'), 12);
});

test('public names drop the admin year', () => {
	assert.equal(publicTitle('Tree lot 2026'), 'Tree lot');
	assert.equal(publicTitle('Ice cream season'), 'Ice cream season');
});

test('menu items match the menu pages and carry no prices', async () => {
	const source = await readFile(new URL('../src/lib/menu.ts', import.meta.url), 'utf8');
	const col = seed.collections.find((c) => c.slug === 'menu_items');
	assert.ok(!col.fields.some((f) => /price/.test(f.slug)));
	for (const section of col.fields.find((f) => f.slug === 'section').validation.options) assert.ok(source.includes(`'${section}'`), `${section} has a page`);
	for (const item of seed.content.menu_items) {
		assert.doesNotMatch(JSON.stringify(item), /\$\s?\d/);
		assert.ok(item.data.square_id, `${item.slug} has a Square ID`);
	}
});
