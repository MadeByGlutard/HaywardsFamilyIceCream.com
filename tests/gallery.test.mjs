// Gallery pick is deterministic per New York calendar day.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, pickGallery, PHOTOS } from '../src/lib/gallery.ts';

test('same day gives the same 4 distinct photos and tilts within -8..8', () => {
  const a = pickGallery('2026-11-22');
  assert.deepEqual(a, pickGallery('2026-11-22'));
  assert.equal(a.length, 4);
  assert.equal(new Set(a.map(p => p.id)).size, 4);
  for (const p of a) {
    assert.ok(PHOTOS.some(photo => photo.id === p.id));
    assert.ok(Number.isInteger(p.tilt) && p.tilt >= -8 && p.tilt <= 8);
  }
});

test('the pick changes across days and eventually uses every photo', () => {
  const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));
  const picks = days.map(d => pickGallery(d).map(p => `${p.id}:${p.tilt}`).join());
  assert.ok(new Set(picks).size > 50);
  assert.equal(new Set(days.flatMap(d => pickGallery(d).map(p => p.id))).size, PHOTOS.length);
});

test('the day rolls over at midnight America/New_York, not UTC', () => {
  assert.equal(dateKey(new Date('2026-11-23T04:59:00Z')), '2026-11-22');
  assert.equal(dateKey(new Date('2026-11-23T05:00:00Z')), '2026-11-23');
  assert.equal(dateKey(new Date('2026-07-01T03:59:00Z')), '2026-06-30');
});

test('dominant-colour placeholders match what gatsby-plugin-sharp produced', async () => {
  const { default: meta } = await import('../src/lib/image-meta.json', { with: { type: 'json' } });
  // Colours read from the Gatsby build of main (gallery 01/03/05/07, silhouette).
  assert.equal(meta['gallery/01'].color, '#a89888');
  assert.equal(meta['gallery/03'].color, '#e8d8d8');
  assert.equal(meta['gallery/05'].color, '#f8f8f8');
  assert.equal(meta['gallery/07'].color, '#282828');
  assert.equal(meta.silhouette.color, '#f8f8f8');
  for (const photo of PHOTOS) assert.match(photo.color, /^#[0-9a-f]{6}$/);
  assert.equal(PHOTOS.length, 8);
});
