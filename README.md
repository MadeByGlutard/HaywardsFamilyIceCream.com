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
| `npm run build`     | Production Worker build into `.cloudflare/output/`                   |
| `npm run preview`   | Serve the production build locally                                   |
| `npm run images`    | Regenerate optimized images in `public/` from `src/assets/`          |
| `npm run deploy`    | Build and deploy production with `cf deploy` (config in `cloudflare.config.ts`) |
| `npm run preview:deploy` | Deploy the current branch as a Worker Preview with its own D1/R2 (see Previews) |
| `npm run preview:delete` | Delete the current branch's preview and its D1/R2                    |

### Run locally (fresh clone, macOS)

Requires Node 24.22 or later (`.nvmrc` pins 24; the `cf` CLI needs 24.22+) and npm. No Cloudflare account or login is needed.

```sh
git clone <repo-url> haywardsfamilyicecream && cd haywardsfamilyicecream
nvm install && nvm use            # reads .nvmrc (Node 24); or fnm use / volta
npm ci                             # exact versions from package-lock.json
cp .env.example .env
npx emdash secrets generate --write .env --force   # fills EMDASH_ENCRYPTION_KEY
npm run dev                        # http://localhost:4321
```

Then open this URL once:

http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/

It runs the database migrations, applies `seed/seed.json` (flavors, categories, settings),
creates a local `dev@emdash.local` admin and signs you in. The admin is at
http://localhost:4321/_emdash/admin. Later, to sign in again without re-seeding, use
http://localhost:4321/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin. Both URLs only
exist in development. Deployed sites use email and password (see Sign-in).

Everything runs locally:

- `astro dev` runs the Worker in workerd.
- D1, R2 and KV are emulated in `.cloudflare/state/`. `remoteBindings: false` is set in
  `astro.config.mjs`, and no binding in `cloudflare.config.ts` is marked remote.
- To start over with an empty database, stop the server, delete `.cloudflare/state/`, start again
  and open the setup URL.
- `.env`, `.cloudflare/` and `.emdash/` are git-ignored.

To try the production build locally: `npm run build`, then `npm run preview`.
The setup URL is disabled in that mode, so seed with `npm run dev` first.

## Sign-in

The admin is at `/admin`, which redirects to EmDash's fixed `/_emdash/admin`. Sign-in is at
`/login`. The admin's name, logo and hidden menu items are set in `astro.config.mjs`.

Staff sign in with an email and password. EmDash has no password login of its own, so
`src/auth/password/` adds one as an EmDash auth provider, and `src/middleware.ts` sends
EmDash's passkey-first login and invite screens to it:

- **First admin:** in the setup wizard, choose "Email and password" on the last step.
- **Invites only:** an admin invites people from the Users screen. With no email provider set
  up, EmDash shows the invite link to share. There is no sign-up page.
- **Forgotten password:** an admin makes a one-time link, good for 24 hours, at
  `/_emdash/password/users`. Anyone signed in can change their own at `/_emdash/password/account`.
- **Storage:** scrypt hashes (OWASP's 16 MiB setting) in EmDash's `_plugin_storage` table.
  Reset tokens are stored hashed.
- **Limits:** per 15 minutes, 10 sign-in attempts per email and 30 per IP address.
- Changing or resetting a password does not sign out other devices that are already signed in.

Cloudflare Access (Zero Trust team `misty-night-ed60`) separately guards the `workers.dev`
address and previews, for developers only. The real domain has no Access in front of it, so
finish setup before attaching it: until then, whoever opens the wizard first becomes admin.

## Previews

Every branch other than `main` can have a Worker Preview with its own D1 database and R2
bucket, named `haywardsfamilyicecream-com-<branch>`:

- `npm run preview:deploy` creates them on the first run and copies production into them:
  schema, rows (including users and their password hashes, so the same people can sign in) and
  media. Later runs
  reuse them; pass `-- --reseed` to copy production again. It then runs `cf previews deploy`,
  which builds with `isPreview` so `cloudflare.config.ts` binds the preview's own D1/R2 and
  leaves out the cron trigger.
- The copy goes statement by statement because D1's export API refuses databases with FTS5
  tables, which EmDash uses for search.
- `npm run preview:delete` deletes the preview, its database and its bucket. Nothing deletes
  them automatically when a branch is deleted.
- Preview URLs (`https://<branch>-haywardsfamilyicecream-com.tuckerwhitehouse.workers.dev`)
  are behind the same Access application.
- Credentials: `CLOUDFLARE_API_TOKEN` (needs D1 Edit and Workers R2 Storage Edit as well as
  the Workers permissions).
- `.github/workflows/previews.yml` runs `preview:deploy` on every push to a branch other than
  `main`, and `preview:delete` when a branch is deleted (GitHub only runs that from the default
  branch, so cleanup starts once the workflow is on `main`). It needs the
  `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable.
- Previews don't inherit production's secrets. `EMDASH_ENCRYPTION_KEY` is set in the Worker's
  Previews Base config (same value as production, since preview databases are copies) with
  `npx wrangler preview base-config secret put EMDASH_ENCRYPTION_KEY --worker-name haywardsfamilyicecream-com`,
  and every new preview starts with it.

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

- `cloudflare.config.ts` turns on the Workers cache, which sits in front of the Worker:
  `cache: { enabled: true }`.
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
- `npm run preview` cannot test the edge behaviour. Local workerd does not run the Workers
  cache layer, and its `cloudflare:workers` `cache` has no `purge()`. A publish there logs
  `[cache] Failed to invalidate ... cache.purge is not a function`. EmDash catches this, so
  the write still succeeds.
- Purge on publish was checked on the deployed Worker on 2026-11-23: a cached homepage went
  from HIT to MISS with the new banner within a second of publishing, then back to HIT.
- Only signed-out visits fill the cache; signed-in responses are `no-store`. Once the page is
  cached, signed-in visits get the cached copy too, which is why `toolbar: "client"` is set.
- A version address (`<version>-haywardsfamilyicecream-com...workers.dev`) has its own cache,
  which publishing in production does not purge, and its requests don't show in the logs.
- The adapter ignores the result of a purge, so a refused one (over the rate limit) is silent.

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
Never commit `.env`, `.cloudflare/`, `.emdash/`, `dist/` or `node_modules/`.

Agent skills for EmDash are in `.agents/skills/`.
