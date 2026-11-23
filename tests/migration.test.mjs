// Proves the EmDash seed mirrors the data the Gatsby site was built from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const seed = JSON.parse(await read('seed/seed.json'));
const originalFlavors = JSON.parse(await read('content/flavors.json'));
const originalSettings = parse(await read('content/settings/settings.yaml'));

const collection = slug => seed.collections.find(c => c.slug === slug);
const field = (coll, slug) => collection(coll).fields.find(f => f.slug === slug);
const published = entries => entries.filter(e => e.status === 'published');

test('every category exists in the original order', () => {
  const expected = originalFlavors.map(group => group.category);
  const actual = published(seed.content.categories)
    .sort((a, b) => a.data.sort_order - b.data.sort_order)
    .map(entry => entry.data.name);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(seed.content.categories.map(e => e.data.sort_order)).size, expected.length);
});

test('flavor category options match the category list exactly', () => {
  assert.deepEqual(field('flavors', 'category').validation.options, originalFlavors.map(g => g.category));
});

test('every flavor keeps its category, order, allergens and half-gallon flag', () => {
  const expected = originalFlavors.flatMap(group =>
    group.flavors.map((flavor, index) => {
      const data = { name: flavor.name, category: group.category, sort_order: index + 1 };
      if ('allergens' in flavor) data.allergens = flavor.allergens;
      if ('half-gallon' in flavor) data.half_gallon = flavor['half-gallon'];
      return data;
    }),
  );
  const actual = published(seed.content.flavors).map(entry => entry.data);
  assert.equal(actual.length, 56);
  assert.deepEqual(actual, expected);
  assert.equal(new Set(seed.content.flavors.map(e => e.slug)).size, expected.length, 'slugs are unique');
  assert.equal(new Set(seed.content.flavors.map(e => e.id)).size, expected.length, 'ids are unique');
});

test('allergen options cover every allergen in the original data', () => {
  const used = new Set(originalFlavors.flatMap(g => g.flavors.flatMap(f => f.allergens ?? [])));
  assert.deepEqual([...used].sort(), [...field('flavors', 'allergens').validation.options].sort());
});

test('settings entry mirrors banner, social and contact exactly', () => {
  const entries = published(seed.content.settings);
  assert.equal(entries.length, 1);
  const [site] = entries;
  assert.equal(site.slug, 'site');
  assert.equal(site.data.banner, originalSettings.banner);
  assert.equal(site.data.banner, 'Closed until Friday, November 27th - Reopening at 11am!');
  assert.deepEqual(site.data.social, originalSettings.social);
  assert.deepEqual(site.data.contact, originalSettings.contact);
});

test('repeater type options cover every type the components render', () => {
  const sub = (coll, f, s) => field(coll, f).validation.subFields.find(x => x.slug === s);
  for (const row of originalSettings.social) assert.ok(sub('settings', 'social', 'type').options.includes(row.type));
  assert.deepEqual(sub('settings', 'contact', 'type').options, ['phone', 'place', 'email']);
});

test('no collection is routable (the site is a single page)', () => {
  for (const c of seed.collections) assert.equal(c.routable, false, c.slug);
});

test('the redesign only adds to the port\'s content model', () => {
  assert.deepEqual(seed.collections.slice(0, 3).map(c => c.slug), ['settings', 'categories', 'flavors']);
  for (const slug of ['pages', 'visit', 'periods', 'products', 'servings']) assert.ok(collection(slug), slug);
  for (const extra of ['description', 'allergen_notes']) assert.ok(!field('flavors', extra).required, extra);
});

test('pages and the Milford location exist, and unknown prices stay unset', () => {
  for (const slug of ['home', 'our-story']) assert.ok(seed.content.pages.find(p => p.slug === slug && p.status === 'published'), slug);
  const visit = seed.content.visit.find(p => p.slug === 'milford');
  assert.equal(visit.data.address, '383 Elm Street');
  assert.equal(visit.data.phone.replace(/\D/g, ''), originalSettings.contact.find(c => c.type === 'phone').value.replace(/\D/g, ''));
  assert.equal(seed.content.servings, undefined);
});
