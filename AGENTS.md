# Hayward’s Family Ice Cream — Milford

Astro and EmDash on Cloudflare Workers, D1 and R2. This is the Milford stand at 383 Elm Street, the same business as the live site.

## Commands

- `npm run dev`: local server and simulated Cloudflare bindings.
- `npm test`: migration integrity tests.
- `npm run typecheck`: Astro/TypeScript checks.
- `npm run build`: Cloudflare Worker production build.

Read `.agents/skills/building-emdash-site/SKILL.md` for content APIs and `.agents/skills/emdash-cli/SKILL.md` for CMS operations. Official docs: https://docs.emdashcms.com/

## Architecture

- `seed/seed.json`: schema and starting content. Databases already set up get new collections and fields from `src/lib/upgrade.ts` (raise `CONTENT_VERSION`); the port's collections are hidden, never deleted. Keep the forms short: add a field only when staff will use it.
- `src/lib/site.ts`: store info, directions and social links. `src/lib/catalog.ts`: categories with their flavors and menu items.
- `src/layouts/Base.astro`: common masthead, menu, SEO hooks and footer.
- `src/pages/`: server-rendered home, menu, story and visit pages.
- `src/styles/theme.css`: responsive newspaper design.
- `public/`: authentic logo, photos and favicons/manifest only (`brand/`, `images/`, `favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`); a test rejects leftover static build output. See `docs/assets.md`.
- `content/`: retained legacy source data for provenance and migration checks.
- `docs/history-research.md`: sources, contradictions and unresolved dates.

All CMS pages remain server-rendered. Never infer gluten-free or other allergen safety from an empty legacy allergen array. Do not invent prices, closing times or a founding year. Use high-contrast type, the red logo and existing Milford photos. Do not commit `.env`, local D1 state, credentials or node_modules. Preserve EmDash's Cloudflare worker and loader wiring. Run browser QA when changing layout or interactions.
