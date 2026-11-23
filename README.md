# Hayward's Family Ice Cream

HaywardsFamilyIceCream.com on Astro + [EmDash](https://docs.emdashcms.com/), running on
Cloudflare Workers with D1 (content) and R2 (media). It is a port of the Gatsby 5 site on
`main` with no visual changes. Staff edit the banner, flavors and contact details in the
EmDash admin at `/_emdash/admin`. Edits go live without a rebuild.

## Commands

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Local server with simulated D1/R2 (workerd)                          |
| `npm test`          | Seed-vs-original data, gallery, cache policy and `public/` guard tests |
| `npm run typecheck` | `astro check`                                                        |
| `npm run build`     | Production Worker build into `dist/`                                 |
| `npm run images`    | Regenerate optimized images in `public/` from `src/assets/`          |
| `npm run deploy`    | Build and `wrangler deploy` (needs real D1/R2 IDs in `wrangler.jsonc`) |

### Local setup

```sh
npm install
cp .env.example .env
npx emdash secrets generate --write .env --force
npm run dev -- --port 4175 --host 127.0.0.1
```

Then open `http://127.0.0.1:4175/_emdash/api/setup/dev-bypass?redirect=/` once. That
applies `seed/seed.json` to the local database and signs you in as a dev admin. Dev
bypass only exists in development. Production needs a real passkey setup.

## Content model (`seed/seed.json`)

| Collection   | Fields                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| `settings`   | One entry, slug `site`: `banner` (plain text, empty hides the band), `social` repeater (label, type, url), `contact` repeater (label, type `phone`/`place`/`email`, url, value) |
| `categories` | `name`, `sort_order`: the flavor headings, in display order                  |
| `flavors`    | `name`, `category` (select), `sort_order` within the category, `allergens` (multi-select), `half_gallon` |

The site does not display `allergens` and `half_gallon`, just as the Gatsby site did not.
They are kept so the data is not lost. "Call for flavor" (Sorbet) never had these keys,
and the seed keeps them absent.

To add a category, add an entry to **Flavor categories**. Also add the same name to the
`category` field's options under **Content Types → Flavors**. Flavors whose category has
no entry are not shown.

The banner is rendered as text, so HTML in it is shown literally. On the Gatsby site it
went through `dangerouslySetInnerHTML`.

`content/flavors.json` and `content/settings/settings.yaml` are the original data from
`main`. They are kept only so `tests/migration.test.mjs` can prove the seed matches them.
Changing them, or the seed, does not change an existing database.

## Gallery

The Gatsby site picked 4 of the 8 photos and a tilt of -8 to 8 degrees for each, once per
build. Here `src/lib/gallery.ts` seeds a small PRNG with the calendar date in
America/New_York. The selection changes once a day at midnight, and every request on the
same day gets identical HTML. The photos are static files: originals in
`src/assets/gallery`, optimized copies in `public/images/gallery`.

## Caching

Pages are cached at Cloudflare's edge until their content changes:

- `wrangler.jsonc` turns on the Workers cache, which sits in front of the Worker:
  `"cache": { "enabled": true }`.
- `astro.config.mjs` sets `cache: { provider: cacheCloudflare() }` from
  `@astrojs/cloudflare/cache`.
- The homepage passes EmDash's `cacheHint`s for `settings`, `categories` and `flavors` to
  `Astro.cache.set()` (`src/lib/cache.ts`). The provider turns them into `Cache-Tag`
  (collection names and entry IDs) and `Cloudflare-CDN-Cache-Control`.
- When an entry is saved, published, unpublished, deleted or restored in the admin, EmDash's
  write route calls `cache.invalidate({ tags: [collection, entryId] })`. That purges every
  cached page that read the entry or its collection. No rebuild and no fixed delay.
- The edge TTL (`maxAge`) is the number of seconds left until the next midnight in
  America/New_York, which is when the gallery pick changes. The calculation is DST-aware.
- Browsers get `Cache-Control: public, max-age=0, must-revalidate`, so they always ask the
  edge and see a purge immediately.
- Other routes declare no cache intent, so the adapter marks them
  `Cloudflare-CDN-Cache-Control: no-store`. This covers the 404 page, sitemaps,
  `/_emdash/*` and the admin.
- Editors are never served a cached page: EmDash marks responses that carry the editor
  toolbar `private, no-store`, and they skip the route cache.

Limits:

- `astro dev` uses a no-op route cache. When `Astro.cache.enabled` is false, the page falls
  back to `Cache-Control: public, max-age=60, s-maxage=300`.
- `wrangler dev` cannot test the edge behaviour. Local workerd does not run the Workers
  cache layer, and its `cloudflare:workers` `cache` has no `purge()`. A publish there logs
  `[cache] Failed to invalidate ... cache.purge is not a function`. EmDash catches this, so
  the write still succeeds.
- Purging has to be checked once after the first deploy:
  1. Request `/` twice and check the second response is a cache hit.
  2. Change the banner in the admin.
  3. Reload: the new banner should appear immediately.

  If purging ever failed, a page could stay stale until New York midnight. The cap is in
  `src/lib/cache.ts`.

## Styling

- `src/styles/typography.css` is the output of `new Typography(fairyGatesTheme).toString()`
  (typography 0.16.24, typography-theme-fairy-gates 0.16.19). It is byte-identical to the
  CSS that gatsby-plugin-typography inlined. Fonts: Work Sans 600 and Quattrocento Sans
  400/400i/700 from Google Fonts. To regenerate it, install those two packages in a scratch
  directory and print `toString()`. Do not add them to this project.
- `src/styles/site.css` ports the Emotion styles from the Gatsby components one to one.
- The navbar's sticky behaviour is a small inline script in `src/components/Navbar.astro`.
  The navbar turns white after 2px of scroll on the homepage and is always white on other
  pages.

## Not ported

- `src/components/map.tsx` was unused, and it contains a committed Google Maps API key.
  That key should be rotated or restricted.
- The unused Lobster Two font link from `gatsby-ssr.tsx`.
- `static/_redirects`, the Netlify subdomain redirect, which has no meaning on Workers.
- `logo.svg` / `icon.svg`, which the site did not use.

## Guardrails

`public/` holds static assets only. `tests/public.test.mjs` fails if `public/index.html` or
any `public/*.js` exists, because Workers would serve those ahead of the Astro routes.
Never commit `.env`, `.wrangler/`, `.emdash/`, `dist/` or `node_modules/`.

Agent skills for EmDash are in `.agents/skills/`.
