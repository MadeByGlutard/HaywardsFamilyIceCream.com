# EmDash implementation notes — 16 November 2026

## Recommendation

Rebuild the small Gatsby frontend as an Astro theme with real EmDash-managed content. EmDash is an Astro CMS, not a Gatsby plugin. Start from the official Cloudflare starter and retain its runtime wiring. Run the actual Cloudflare development runtime locally with simulated D1/R2. No Cloudflare account, resource creation or deployment is needed for this preview.

The worthwhile change is editor ownership: flavor lists, verified descriptions, hours/closure notices, About/history and photos can be edited and published without changing React code. This adds CMS/database maintenance compared with today's static site; the public site should remain a small server-rendered site with minimal client JavaScript.

## Versions and scaffold

Checked npm registry: `emdash`, `create-emdash`, `@emdash-cms/cloudflare` latest are all **1.5.0**. Environment Node is **24.22.1**, meeting the official minimum **22.23.4**. The official starter's semver ranges resolve to current compatible packages; retain the installed lockfile.

```sh
npm create emdash@latest -- emdash-starter --template cloudflare:starter --yes
```

The scaffolder creates a private encryption key in `.env`. Preserve that file locally and do not commit or print it. Sandboxed plugins are unnecessary; leave Worker Loader disabled. The starter dependency set includes Astro, `@astrojs/cloudflare`, `@astrojs/react`, EmDash, `@emdash-cms/cloudflare`, React/React DOM, Wrangler and `@astrojs/check`.

Primary source: https://developers.cloudflare.com/workers/framework-guides/web-apps/emdash/ (web ref `turn27search0` / `turn30view0`). Official template source resolved from published create-emdash package: https://github.com/emdash-cms/templates/tree/main/starter-cloudflare .

## Keep the real Cloudflare wiring

The generated `astro.config.mjs` uses `output: 'server'`, the Cloudflare adapter, React integration for the admin app, `emdash({ database: d1({binding:'DB',session:'auto',coalesce:true}), storage:r2({binding:'MEDIA'}) })`. Retain this structure.

`src/live.config.ts` uses one `_emdash` live collection with `emdashLoader()` from `emdash/runtime`. Custom CMS collections are discovered by that loader; do not manually create an Astro loader per flavor category.

Retain the generated Worker handler, Durable Object bindings, and scheduled handler. Production deployment would use named D1/R2 resources, `nodejs_compat`, and cron wiring. Cloudflare adapter local dev runs workerd and simulates bindings by default. Do not set `remote:true` for local preview.

Sources: https://docs.emdashcms.com/deployment/cloudflare/ (`turn33view1`); https://docs.astro.build/en/guides/integrations-guide/cloudflare/ (`turn27search5`); https://developers.cloudflare.com/workers/local-development/ (`turn27search6`).

## Data model for Hayward's

Recommended collections, intentionally small:

- `flavors`: `title` string, `category` select, `description` text optional, `sort_order` integer indexed, provenance/source URL if useful. A listing is not proof of today's stock; avoid automatically marking every seeded flavor available.
- `pages`: `title` string and `content` portableText, with drafts/revisions/preview/SEO. Seed the researched Our Story page here. Optional source notes can be a private draft entry or developer research file.
- `visit`: one non-routable `milford` entry holding address, phone, opening-time statement, verified closing-time field and dated special notice. Keeping null/unverified values absent is preferable to made-up hours.
- Optional `servings`: size/price information only after owner verification. Do not fill unknown prices.

EmDash does not expose a documented singleton collection property in the current seed type. Use a normal non-routable collection with one known entry rather than inventing `singleton:true`.

## Seed format

Use `seed/seed.json` and `package.json` metadata `"emdash":{"seed":"seed/seed.json"}`. Seed format version is string `"1"`.

```json
{
  "version": "1",
  "settings": {
    "title": "Hayward’s Family Ice Cream",
    "timezone": "America/New_York"
  },
  "collections": [{
    "slug": "flavors",
    "label": "Flavors",
    "labelSingular": "Flavor",
    "routable": false,
    "supports": ["drafts", "revisions", "search"],
    "titleField": "title",
    "fields": [
      {"slug":"title","label":"Flavor","type":"string","required":true,"indexed":true},
      {"slug":"category","label":"Category","type":"select","validation":{"options":["Ice cream","Frozen yogurt","Sherbet","Sorbet","Vegan","No sugar added"]}},
      {"slug":"description","label":"Description","type":"text"},
      {"slug":"sort_order","label":"Display order","type":"integer","indexed":true}
    ]
  }],
  "content": {
    "flavors": [{
      "id":"flavor-vanilla",
      "slug":"vanilla",
      "status":"published",
      "data":{"title":"Vanilla","category":"Ice cream","sort_order":44}
    }]
  }
}
```

Fields such as `id`, `slug`, `status`, timestamps and revision IDs are reserved system fields; do not redeclare them. Selection choices belong to `validation.options`. A source list can be a repeater of URL/title fields. Rich text uses Portable Text block arrays and renders with `PortableText` from `emdash/ui`.

Sources: https://docs.emdashcms.com/themes/seed-files/ (`turn33view0`); https://docs.emdashcms.com/reference/field-types/ (`turn39view0`). Also inspected the published package's source types.

## Actual local setup and admin

Start `astro dev`. On first request the runtime migrates its local D1 and prepares the seed's schema. To seed content and open a functional local admin without asking the user to create a passkey for a temporary development host, navigate to:

`/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`

Confirmed from **published emdash@1.5.0 source**, not guessed: this official endpoint accepts GET/POST, only exists under `import.meta.env.DEV`, applies seed content by default with conflict mode `skip`, creates/reuses `dev@emdash.local`, completes setup and saves the session. `?content=0` or `false` skips entries; omit it for the authored Hayward's seed. Do not append `token=1`, which unnecessarily creates a personal access token. Production builds return 403 for this bypass.

After setup, `/_emdash/api/auth/dev-bypass?redirect=/_emdash/admin` creates a local dev session without reseeding. CLI commands targeting localhost authenticate through the official dev endpoint after setup. Production still needs real owner passkey setup; do not carry the local database/users into production.

The CLI `emdash seed --validate` validates without applying; normal `emdash seed` targets direct SQLite files, not a D1 API. For local D1 use the above runtime setup path rather than modifying Wrangler's private SQLite file. `emdash doctor`'s direct-SQLite database check can fail on D1 projects while its scheduling checks still work.

Source: https://docs.emdashcms.com/reference/cli/ (`turn30view1`). Exact implementation inspected at `/tmp/emdash-research/core/package/src/astro/routes/api/setup/dev-bypass.ts` and `api/auth/dev-bypass.ts` from npm `emdash@1.5.0`.

## Content queries

```ts
import { getEmDashCollection, getEmDashEntry } from 'emdash';
const { entries: flavors, error } = await getEmDashCollection('flavors', {
  orderBy: { sort_order: 'asc' }
});
const { entry: story } = await getEmDashEntry('pages', 'our-story');
```

Read custom fields from `entry.data.title` etc. `entry.id` is normally the URL slug; `entry.data.id` is the stable content ID. Queries default to published content. Handle `error` separately from an empty collection or missing entry. Publishing affects the next server render, not a Gatsby rebuild.

Source: https://docs.emdashcms.com/guides/querying-content/ (`turn33view2`).

## Verification checklist

Verify home/menu/story/visit in the browser; menu filter and navigation work; actual CMS has authored entries; publishing a harmless temporary edit changes the public render and can be reverted; no client console failures. Validate seed and run Astro typecheck/build. Confirm source assets retained, source notes separate from customer-facing text, prices/hours unverified remain absent. Keep `.env`, `.wrangler`, node_modules and generated local database out of Git.

No app files, Cloudflare resources, credentials or production deployments were changed by this research task.
