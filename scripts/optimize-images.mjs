// Regenerates the optimized static images in public/ from the originals in
// src/assets/. Run with `npm run images` after replacing an original; the
// output is committed so builds do not depend on sharp.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const src = new URL('../src/assets/', import.meta.url);
const out = new URL('../public/', import.meta.url);
const images = new URL('images/', out);
const icons = new URL('icons/', out);

await rm(images, { recursive: true, force: true });
await rm(icons, { recursive: true, force: true });
await mkdir(new URL('gallery/', images), { recursive: true });
await mkdir(icons, { recursive: true });

const path = url => url.pathname;
const meta = {};

// Same as gatsby-plugin-sharp's "dominantColor" placeholder: sharp's stats().dominant
// of the original image, as a hex colour.
async function describe(key, input) {
  const image = sharp(path(input)).rotate();
  const { width, height } = await image.metadata();
  const { dominant } = await sharp(path(input)).stats();
  const color = '#' + [dominant.r, dominant.g, dominant.b].map(v => v.toString(16).padStart(2, '0')).join('');
  meta[key] = { width, height, color };
}

async function variants(input, base, widths, formats) {
  for (const width of widths) {
    const resized = () => sharp(path(input)).resize({ width, withoutEnlargement: true });
    for (const [format, options] of Object.entries(formats)) {
      await resized()[format](options).toFile(path(new URL(`${base}-${width}.${format === 'jpeg' ? 'jpg' : format}`, images)));
    }
  }
}

await describe('logo', new URL('logo.png', src));
await describe('silhouette', new URL('silhouette.png', src));

// Logo: header (768px constrained, quality 100) and footer (128px constrained).
await variants(new URL('logo.png', src), 'logo', [128, 192, 256, 384, 768], {
  png: { compressionLevel: 9, palette: false },
  webp: { quality: 100, alphaQuality: 100 },
});

// Contact background (full width, quality 100).
await variants(new URL('silhouette.png', src), 'silhouette', [750, 1080, 1334], {
  png: { compressionLevel: 9 },
  webp: { quality: 100 },
});

// Gallery: displayed at up to 320px, 2x for high-density screens.
for (const file of (await readdir(new URL('gallery/', src))).filter(f => f.endsWith('.jpg')).sort()) {
  const name = file.replace(/\.jpg$/, '');
  await describe(`gallery/${name}`, new URL(`gallery/${file}`, src));
  for (const width of [160, 320, 640]) {
    const resized = () => sharp(path(new URL(`gallery/${file}`, src))).rotate().resize({ width });
    await resized().jpeg({ quality: 80, mozjpeg: true }).toFile(path(new URL(`gallery/${name}-${width}.jpg`, images)));
    await resized().webp({ quality: 80 }).toFile(path(new URL(`gallery/${name}-${width}.webp`, images)));
  }
}

// Favicon and manifest icons, padded to squares like gatsby-plugin-manifest.
const icon = size =>
  sharp(path(new URL('icon.png', src))).resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();
await icon(32).toFile(path(new URL('favicon-32x32.png', out)));
for (const size of [48, 72, 96, 144, 192, 256, 384, 512]) {
  await icon(size).toFile(path(new URL(`icon-${size}x${size}.png`, icons)));
}
await writeFile(path(new URL('../src/lib/image-meta.json', import.meta.url)), JSON.stringify(meta, null, 2) + '\n');
console.log('Images written to public/images and public/icons');
