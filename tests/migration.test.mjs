// Proves the EmDash seed mirrors the data the Gatsby site was built from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const seed = JSON.parse(await read('seed/seed.json'));
const originalFlavors = JSON.parse(await read('content/flavors.json'));
const originalSettings = parse(await read('content/settings/settings.yaml'));

const categories = Object.fromEntries(seed.content.catalog_categories.map(c => [`$ref:${c.id}`, c.slug]));
const slugs = { 'Ice Cream': 'ice-cream', Sherbet: 'sherbet', Yogurt: 'yogurt', Sorbet: 'sorbet', Vegan: 'vegan', 'No Sugar Added': 'no-sugar-added' };

test('every flavor keeps its category, allergens and half-gallon flag', () => {
  assert.deepEqual(Object.keys(slugs), originalFlavors.map(group => group.category));
  const row = (name, category, allergens = [], half = false) => JSON.stringify([name.replace(/'/g, '’'), category, allergens.map(a => a[0].toUpperCase() + a.slice(1)), !!half]);
  // "Call for flavor" stood in for a changing list; the empty Sorbet category says so instead.
  const expected = originalFlavors.flatMap(group => group.flavors.filter(f => f.name !== 'Call for flavor').map(f => row(f.name, slugs[group.category], f.allergens, f['half-gallon'])));
  const actual = seed.content.catalog_flavors.map(e => row(e.data.name, categories[e.data.category], e.data.allergens, e.data.half_gallon));
  assert.equal(actual.length, 55);
  assert.deepEqual(actual.sort(), expected.sort());
});

test('contact details and social links carry over', () => {
  const store = seed.content.store[0].data;
  const contact = type => originalSettings.contact.find(c => c.type === type).value;
  assert.equal(store.phone.replace(/\D/g, ''), contact('phone').replace(/\D/g, ''));
  assert.equal(store.email, contact('email'));
  assert.equal(store.address, '383 Elm Street');
  assert.ok(originalSettings.social.find(s => s.type === 'facebook').url.toLowerCase().endsWith(seed.settings.social.facebook.toLowerCase()));
});

test('pages exist', () => {
  for (const slug of ['home', 'flavors', 'sundaes', 'food', 'trees', 'visit', 'history']) assert.ok(seed.content.site_pages.find(p => p.slug === slug && p.status === 'published'), slug);
});
