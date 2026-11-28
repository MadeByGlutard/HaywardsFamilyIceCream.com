# Hayward's Family Ice Cream

HaywardsFamilyIceCream.com on Astro + [EmDash](https://docs.emdashcms.com/), running on
Cloudflare Workers with D1 (content) and R2 (media). This branch is the newspaper redesign on
top of the port of the Gatsby 5 site. Staff edit everything in the EmDash admin at `/admin`.
Edits go live without a rebuild.

## Commands

| Command             | What it does                                                         |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Local server with simulated D1/R2 (workerd)                          |
| `npm test`          | Seed-vs-original data, schedule, cache, password and `public/` guard tests |
| `npm run typecheck` | `astro check`                                                        |
| `npm run build`     | Production Worker build into `.cloudflare/output/`                   |
| `npm run preview`   | Serve the production build locally                                   |
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
- **Invites only:** an admin invites people from the Users screen, and EmDash emails the invite
  (see Email). There is no sign-up page.
- **Forgotten password:** an admin makes a one-time link, good for 24 hours, at
  `/_emdash/password/users`. Anyone signed in can change their own at `/_emdash/password/account`.
- **Storage:** scrypt hashes (OWASP's 16 MiB setting) in EmDash's `_plugin_storage` table.
  Reset tokens are stored hashed.
- **Limits:** per 15 minutes, 10 sign-in attempts per email and 30 per IP address.
- Changing or resetting a password signs out every other device: a session remembers which
  password it signed in under (`src/auth/password/current.ts`), and `src/middleware.ts` ends
  sessions from an older one. Only the newest reset link for a person works, and none works
  once their password has changed since it was made.

Cloudflare Access (Zero Trust team `misty-night-ed60`) separately guards the `workers.dev`
address and previews, for developers only. The real domain has no Access in front of it, so
finish setup before attaching it: until then, whoever opens the wizard first becomes admin.

## Previews

Every branch other than `main` can have a Worker Preview with its own D1 database, R2 bucket
and KV namespace (sign-in sessions), named `haywardsfamilyicecream-com-<branch>`:

- `npm run preview:deploy` creates them on the first run and copies production into them:
  schema, rows and media, except sign-in data: passwords, reset links, API and OAuth tokens and
  passkeys stay in production (`SIGN_IN_TABLES` in `scripts/preview.mjs`). Users are copied, and
  people sign in through Access, so they keep their accounts and roles. Later runs
  reuse them; pass `-- --reseed` to copy production again. It then runs `cf previews deploy`,
  which builds with `isPreview` so `cloudflare.config.ts` binds the preview's own D1/R2 and
  leaves out the cron trigger.
- The copy goes statement by statement because D1's export API refuses databases with FTS5
  tables, which EmDash uses for search.
- `npm run preview:delete` deletes the preview, its database and its bucket. Nothing deletes
  them automatically when a branch is deleted.
- Preview URLs are `https://<branch>.previews.haywardsfamilyicecream.com` and
  `https://<branch>-haywardsfamilyicecream-com.tuckerwhitehouse.workers.dev`, both behind the
  same Access application (it lists `*.previews.haywardsfamilyicecream.com`). The custom domain
  is preview-only (`domains` in `cloudflare.config.ts`) and doesn't touch the live site's apex
  and `www` records. It was applied with `cf workers triggers deploy`, which sets routes and
  domains without uploading code; a full deploy applies it too. Previews send
  `X-Robots-Tag: noindex`.
- The admin needs no second login on previews: Access's signed token signs people in
  (`accessSignIn` in `astro.config.mjs`). New people become admins; existing accounts keep their
  role. Every page shows EmDash's Edit button, so there is no need to open the admin first.
  Production builds keep email and password.
- Credentials: `CLOUDFLARE_API_TOKEN` (needs D1 Edit and Workers R2 Storage Edit as well as
  the Workers permissions).
- `.github/workflows/previews.yml` runs `preview:deploy` on every push to a branch other than
  `main`, and `preview:delete` when a branch is deleted (GitHub only runs that from the default
  branch, so cleanup starts once the workflow is on `main`). It needs the
  `CLOUDFLARE_API_TOKEN` secret and the `CLOUDFLARE_ACCOUNT_ID` variable.
- After deploying, `preview:deploy` loads the preview once so the content upgrade runs then,
  not for the first person to open it. It gets past Access with a service token
  ("Previews deploy: content upgrade", allowed by the previews' Access app, expires November 2027)
  in the `PREVIEW_ACCESS_CLIENT_ID` and `PREVIEW_ACCESS_CLIENT_SECRET` secrets.
- Previews send no email: `cloudflareEmail` and the `EMAIL` binding are production only.
- Previews don't inherit production's secrets. `EMDASH_ENCRYPTION_KEY` is set in the Worker's
  Previews Base config with
  `npx wrangler preview base-config secret put EMDASH_ENCRYPTION_KEY --worker-name haywardsfamilyicecream-com`,
  and every new preview starts with it. It should be a key of its own (`npx emdash secrets generate`),
  not production's: as of 2026-11-26 neither database holds encrypted settings, so changing it
  loses nothing. If production ever stores encrypted settings, previews can't read their copies.

## Email

The admin sends mail (invites) through Cloudflare's Email Service with EmDash's
`cloudflareEmail` plugin and the `EMAIL` binding. Mail comes from
`cms@mail.haywardsfamilyicecream.com`; replies go to the stand's Gmail. Sending is set up on
the `mail` subdomain only, so the main domain's mail records are untouched. Settings, Email
in the admin sends a test message.

## Plugins

`cloudflareEmail` comes with EmDash; "Hayward's admin" is `src/admin/`. The sandbox is on, so an
admin can install plugins from EmDash's registry; those run in their own isolates (the `LOADER`
binding, a Workers Paid feature).

EmDash indexes where media is used only while its Media screen is open, so `src/admin/shared.ts`
moves it along whenever someone opens the admin.

## Content model (`seed/seed.json`)

| In the admin | Collection           | Fields                                                        |
| ------------ | -------------------- | ------------------------------------------------------------- |
| Schedule     | `schedule`           | `title`, `kind`, `start_date`, `status_text`, `hero_headline`, `hero_deck`, `banner_text` |
| Flavors      | `catalog_flavors`    | `name`, `category`, `description`, `allergens`, `half_gallon`, `photo`             |
| Menu items   | `catalog_items`      | `name`, `category`, `options`                                 |
| Categories   | `catalog_categories` | `name`, `flavors`, `items`                                    |
| Store info   | `store`              | One entry: `phone`, `email`, `address`, `locality`            |
| Jobs         | `jobs`               | `name`, `description`, `hiring`                               |
| Pages        | `site_pages`         | One per page: `title`, `headline`, `excerpt`, `content`       |

EmDash's own Menus hold the navigation (`primary`, which links to Pages: all of them are in the footer, and those ticked "Show in the top menu" in Pages are in the top menu too) and the four menus of categories (`flavors`,
`sundaes`, `food`, `trees`). Facebook and Instagram are Settings, Social links.

- **Pages:** every page has an entry, and its slug is its address (`home` is `/`). Unpublishing
  one takes the page down and out of the navigation. Home's headline comes from the Schedule.
- **Jobs:** the positions on `/jobs` (Join our team, linked from the footer), A to Z. "Hiring
  now" marks the ones open. No pay, ages or hours unless Hayward's gives them.
- **Schedule:** there is always a period, and it is the only source of the hours, the banner
  and the home page headline. A period runs until the next one starts, so there is no end
  date: a winter break lasts until staff schedule what comes after. `kind` sets the color,
  photos, Trees & wreaths link and home page button. Summer hours (until 9pm) are their own
  period, a draft with no date: summer has no set dates, so staff give it one and publish it,
  then add a period back to 8pm when summer hours end.
- **Catalog:** shaped like Square's. Flavors and menu items are records that reference a
  category, and a menu lists categories in order. A category's item order is set on the
  category, and flavors sort themselves. A category on no menu isn't shown. `sizes` and `cones-and-toppings` are set apart on the
  Flavors page; a category added to another menu goes in its last column. A flavors category
  with no flavors reads "Changes often. Ask at the window."
- Square IDs aren't content. `seed/square-ids.json` goes into the admin plugin's storage
  (`src/lib/square.ts`), and the editor's sidebar shows them read-only.
- Allergens, half gallons and photos are tracked but not shown. Never show an allergen as
  absent: unchecked doesn't mean "free of".
- **Blog** (`posts`, `/blog` and `/blog/<slug>`): title, introduction, photo, text and sources (shown
  folded up at the end, like History's); the author is the
  post's EmDash byline (Jennifer on the first post), shown with the byline's avatar or, without one,
  its initial. Bylines (and their avatars) are under Bylines in the admin, and the editor's Bylines
  panel sets a post's author. The landing page's title and introduction are the Blog entry in Pages.
  Join our team and Blog are footer-only pages in Main navigation (see Pages, "Show in the top menu").
- Staff can preview another date with `?today=2026-12-01` or a period with `?period=trees` (or `summer`;
  a published period with no start date yet is shown as of today). `/design-preview` shows one page
  in every published period side by side.
- **Tub counts** (Plugins → Tub counts, `src/admin/tubs.ts`, `tub-flow.ts` and `tub-counts.tsx`):
  staff only, built around where a tub is: Hardening (just made) → Back freezer → Front freezer →
  Cabinets. The first three are counts; Cabinets is In or Out, one tub per flavor in its slot. On a
  wide screen (1024px and up) the page is one table of every flavor A–Z with a search box, "Made a
  batch" and the last 5 changes; clicking a row opens that flavor in a dialog with its next moves
  (To back, To front, Into cabinets or Swap tub, Used up) above all four values. On phones and
  tablets a switch picks Places or All flavors. Places has tabs for each place (with its tubs;
  Cabinets counts flavors in), each listing the flavors there with their one next move; a row
  stays, faded, after its last tub leaves until you switch places or search. All flavors is a
  compact list of every flavor's counts. A flavor's sheet (a bottom sheet on phones, a dialog from
  768px) has the same moves plus every count. Every change shows an 8-second Undo, and repeating
  the same move adds up ("Moved 3 Chocolate to the front freezer") under one Undo. Counts live in
  the plugin's storage with a short change log. Each tap is one guarded update, so simultaneous
  taps can't go below zero; a saved sheet is last-write-wins. Older records are converted on first
  load (four-count sheet: Freezing → Hardening, any Cabinets → In; first version: back tubs added
  that day → Hardening). Counts never change the website.
- `src/admin/`: the Category column and the Square panel (the "Hayward's admin" plugin), and the sidebars everyone starts with (no ownership or URL panels).

`content/flavors.json` and `content/settings/settings.yaml` are the original data from
`main`. They are kept only so `tests/migration.test.mjs` can prove the seed matches them.

### Managed in EmDash, not in code

Anything staff can manage in the admin lives there, not in this repository:

- **Redirects** are under Redirects in the admin. The seed starts them with `/home` → `/`: EmDash
  gives the Home page the address `/home`, which its View link and the sitemap use. EmDash also
  adds one when a page's slug changes.
- **The sitemap** is EmDash's own (`/sitemap.xml`): published pages and posts, minus any marked
  "hide from search engines" in a page's SEO panel. `robots.txt` points to it.
- **Page text** is in each page's fields, not the templates: the Summary (the homepage's menu
  columns and the search-engine description; `{flavors}` is the number of ice cream flavors), the
  band at the bottom (headline, button, link), the Jobs page's "Want to work here?" (its Text:
  heading and first paragraph above the buttons, the rest below), and the Trees page's
  Introduction (before the season) and Text after the season. A band that links to an
  unpublished page, and the Trees page outside the season, use the Hours & directions page's band.
- **Site-wide notes** are in Store info: the allergy note on the menu pages (its opening question
  is bold), the line for an empty flavor list, and the page-not-found headline and text.
- **Photos** are in the Media library and each page's Photo and Photos fields (Home's Photos, the
  Trees gallery, a menu page's photo, History's postcard and its caption). A schedule period's Home
  page photos replace the Home page's while it's on (the tree lot's also show while closed just
  before it). Crops follow each photo's focal point. `public/images` and `seed/photos.json` are
  only the starting set: the content upgrade copies them into the library once.
- **History's sources** are its Sources field.
- **Menus** drop a page while it's unpublished.

### Databases already set up

EmDash applies the seed during setup only, so `src/lib/upgrade.ts` adds what a database is
missing once per `CONTENT_VERSION`, on the first request after a deploy, and other requests wait
for it (several seconds on D1). Preview deploys make that request themselves (see Previews); after a
production deploy, open the site yourself right away, with a query string the cache hasn't seen. The port's flavors
(with allergens and half gallons), banner and social links carry over, staff's changes included.
Menus already there are left alone. Its `settings`, `categories`
and `flavors` collections, and the redesign's first ones on older previews, are then hidden from the admin but kept, with their data (allergens
and half gallons too), so going back to the port loses nothing. To edit them after going
back, unhide them under Content Types. Delete them once going back is off the table.

## Caching

Pages are cached at Cloudflare's edge until their content changes:

- `cloudflare.config.ts` turns on the Workers cache, which sits in front of the Worker:
  `cache: { enabled: true }`.
- `astro.config.mjs` sets `cache: { provider: cacheCloudflare() }` from
  `@astrojs/cloudflare/cache`.
- Every content page is tagged with all the collections it can show (`CONTENT_TAGS` in
  `src/lib/cache.ts`). The provider turns those into `Cache-Tag` and `Cloudflare-CDN-Cache-Control`.
- When an entry is saved, published, unpublished, deleted or restored in the admin, EmDash's
  write route calls `cache.invalidate({ tags: [collection, entryId] })`. That purges every
  cached page that read the entry or its collection. No rebuild and no fixed delay.
- The edge TTL (`maxAge`) is the number of seconds left until the next midnight in
  America/New_York, when hours and schedule periods can change. The calculation is DST-aware.
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

## Going live

The live domain is on Cloudflare Pages (`main`, Gatsby) until this is done. Nothing below has
been run. Rollback at any step: set `SERVE_LIVE_DOMAIN` back to `false`, deploy, and reattach
the domains to the Pages project.

1. **Resources:** confirm production D1, R2 and KV (`cloudflare.config.ts`) and the
   `EMDASH_ENCRYPTION_KEY` secret exist.
2. **Admin first:** deploy (`npm run deploy`) and finish setup on the `workers.dev` address
   (behind Access) before the domain points here. Otherwise whoever opens the wizard first
   becomes admin. Invite staff; check the invite email arrives.
3. **Content upgrade:** load the `workers.dev` address once, with a query string the cache hasn't
   seen (`/?upgrade=1`, a new number each time), and wait for the page, so the upgrade
   runs then and not for a visitor. A failed upgrade shows "We're updating the website" (503,
   not cached) instead of a broken page; the Worker logs say why.
4. **Pause Pages:** turn off automatic deployments on the Pages project, so a push to `main`
   doesn't redeploy Gatsby, then remove `haywardsfamilyicecream.com` and `www` from its custom domains.
5. **Move the domain:** set `SERVE_LIVE_DOMAIN = true`, commit, then
   `npx cf workers triggers deploy` (routes and domains only) or a full `npm run deploy`.
6. **Check:**
   - `https://haywardsfamilyicecream.com/` and `www` load; `www` should redirect or serve the same page.
   - `curl -sI https://haywardsfamilyicecream.com/` twice: `cf-cache-status: HIT` the second time.
   - Publish a banner change in the admin and see it at once (purge on publish).
   - `/login` works with a password; `/admin` asks for it.
   - The cron trigger runs (Worker logs, every minute).
   - In Google Search Console, submit `https://haywardsfamilyicecream.com/sitemap.xml` in place of
     Gatsby's `/sitemap-index.xml`.
7. **Afterwards:** rotate the Google Maps key that `main` committed, and delete the port's
   hidden collections once going back is off the table (Databases already set up).

## Guardrails

`public/` holds static assets only. `tests/public.test.mjs` fails if `public/index.html` or
any `public/*.js` exists, because Workers would serve those ahead of the Astro routes.
Never commit `.env`, `.cloudflare/`, `.emdash/`, `dist/` or `node_modules/`.

Agent skills for EmDash are in `.agents/skills/`.
