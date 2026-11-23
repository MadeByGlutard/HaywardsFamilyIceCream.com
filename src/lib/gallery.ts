/**
 * Gallery selection.
 *
 * The Gatsby site picked 4 of the 8 photos (lodash sampleSize) and a tilt of
 * -8..8 degrees for each (lodash random) once per build. Pages are now
 * rendered on request, so the pick is seeded from the calendar date in
 * America/New_York instead: it changes once a day and every request on the
 * same day gets identical (cacheable) HTML.
 */

import meta from './image-meta.json' with { type: 'json' };

export interface GalleryPhoto {
  id: string;
  /** Display size: gatsbyImageData(width: 320) keeps the aspect ratio. */
  width: number;
  height: number;
  /** Dominant colour placeholder, computed by scripts/optimize-images.mjs. */
  color: string;
}

export const DISPLAY_WIDTH = 320;

/** Originals live in src/assets/gallery; optimized copies in public/images/gallery. */
export const PHOTOS: readonly GalleryPhoto[] = Object.entries(meta)
  .filter(([key]) => key.startsWith('gallery/'))
  .map(([key, image]) => ({
    id: key.slice('gallery/'.length),
    width: DISPLAY_WIDTH,
    height: Math.round((DISPLAY_WIDTH * image.height) / image.width),
    color: image.color,
  }))
  .sort((a, b) => a.id.localeCompare(b.id));

export const GALLERY_SIZE = 4;
export const MAX_TILT = 8;
export const TIME_ZONE = 'America/New_York';

/** YYYY-MM-DD for `now` in the shop's time zone. */
export function dateKey(now: Date = new Date(), timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** FNV-1a 32-bit hash of a string. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast seeded PRNG returning floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GalleryItem extends GalleryPhoto {
  tilt: number;
}

/** Deterministic equivalent of `sampleSize(photos, 4)` + `random(-8, 8)` for a given day. */
export function pickGallery(key: string = dateKey(), photos: readonly GalleryPhoto[] = PHOTOS): GalleryItem[] {
  const random = mulberry32(hash(`gallery:${key}`));
  const pool = [...photos];
  const size = Math.min(GALLERY_SIZE, pool.length);
  // Partial Fisher-Yates shuffle, like lodash's sampleSize.
  for (let i = 0; i < size; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, size).map(photo => ({
    ...photo,
    // Integer in [-MAX_TILT, MAX_TILT], inclusive like lodash's random(-8, 8).
    tilt: Math.floor(random() * (2 * MAX_TILT + 1)) - MAX_TILT,
  }));
}
