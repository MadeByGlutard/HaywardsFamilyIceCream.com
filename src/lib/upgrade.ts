/**
 * Brings a database that is already set up to the content model in seed/seed.json.
 *
 * EmDash applies the seed during setup only. Afterwards, a collection added to the
 * seed would never reach production or a preview copied from it. This runs EmDash's
 * own seed code once per CONTENT_VERSION. It adds:
 *   - new collections, and new fields on existing ones;
 *   - the starting entries of collections the database did not have before.
 * The port's flavors and categories become linked records, its banner goes to the current
 * schedule period and its social links to Settings. Replaced collections are then hidden from the
 * admin but kept, so going back loses nothing.
 */
import { SchemaRegistry, setSiteSettings } from 'emdash';
import { applySeed, type SeedFile } from 'emdash/seed';
import { OptionsRepository } from 'emdash/api/route-utils';
import { getDb } from 'emdash/runtime';
import { sql } from 'kysely';
import seed from '../../seed/seed.json';
import { linkSquareItems } from './square';

/** The port's collections and the redesign's first ones: replaced, hidden from the admin, kept. */
const PORT = ['settings', 'categories', 'flavors'];
const REPLACED = [...PORT, 'pages', 'visit', 'periods', 'products', 'menu_items', 'servings', 'menu_lists'];

/** Raise when seed.json gains a collection or field. */
export const CONTENT_VERSION = 11;
const VERSION = 'haywards:content_version';
const LOCK = 'haywards:content_upgrade_lock';
// On D1 an upgrade takes about two minutes, one query at a time.
const LOCK_MS = 600_000;
const WAIT_MS = 60_000;
/** Collections this upgrade is adding, kept until it finishes so a retry can resume. */
const ADDING = 'haywards:content_upgrade_adding';

let done: Promise<void> | undefined;

/** Once per Worker isolate; a failure is retried on the next request. */
export function ensureContentModel(): Promise<void> {
  // getDb, not locals.emdash.db: EmDash leaves the database off signed-out requests.
  done ??= getDb().then(upgrade).catch((error) => {
    done = undefined;
    console.error('[content-upgrade] failed:', error);
  });
  return done;
}

async function upgrade(db: any) {
  const options = new OptionsRepository(db);
  const complete = await options.get('emdash:setup_complete');
  if (complete !== true && complete !== 'true') {
    // Setup applies the whole seed itself. Look again on the next request.
    done = undefined;
    return;
  }
  if (Number((await options.get(VERSION)) ?? 1) >= CONTENT_VERSION) return;

  // One isolate at a time; a crashed one frees the lock after ten minutes.
  const now = Date.now();
  const { rows } = await sql`
    INSERT INTO options (name, value) VALUES (${LOCK}, ${String(now)})
    ON CONFLICT (name) DO UPDATE SET value = excluded.value
      WHERE CAST(options.value AS integer) < ${now - LOCK_MS}
    RETURNING name
  `.execute(db);
  if (!rows.length) {
    // Another isolate is on it: wait, so this visitor doesn't get a page without its content.
    for (let waited = 0; waited < WAIT_MS; waited += 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (Number((await options.get(VERSION)) ?? 1) >= CONTENT_VERSION) return;
    }
    throw new Error('timed out waiting for another instance');
  }

  try {
    await addMissing(db, options);
    await options.set(VERSION, CONTENT_VERSION);
    await options.delete(ADDING);
  } finally {
    await options.delete(LOCK);
  }
}

async function addMissing(db: any, options: OptionsRepository) {
  const file = structuredClone(seed) as unknown as SeedFile;
  const { rows: existing } = await sql<{ slug: string }>`SELECT slug FROM _emdash_collections`.execute(db);
  const had = new Set(existing.map((row) => row.slug));
  // An interrupted run leaves some of these created but empty, so go by its list.
  const resumed = (await options.get(ADDING)) as string[] | null;
  const adding = Array.isArray(resumed) ? resumed : (file.collections ?? []).map((c) => c.slug).filter((slug) => !had.has(slug));
  await options.set(ADDING, adding);
  const added = Object.fromEntries(Object.entries(file.content ?? {}).filter(([slug]) => adding.includes(slug))) as Record<string, any[]>;
  if (PORT.every((slug) => had.has(slug))) await carryOver(db, added, file);

  // Seed "skip" leaves existing collections alone entirely, and "update" would overwrite
  // labels and choices staff changed, so missing fields are added one by one.
  const registry = new SchemaRegistry(db);
  for (const collection of file.collections ?? []) {
    if (!had.has(collection.slug)) continue;
    for (const field of collection.fields)
      if (!(await registry.getField(collection.slug, field.slug))) await registry.createField(collection.slug, { ...field, required: false } as any);
  }
  // EmDash replaces the items of a menu it finds in the seed; staff's menus stay theirs.
  const { rows: menus } = await sql<{ name: string }>`SELECT name FROM _emdash_menus`.execute(db);
  const newMenus = file.menus?.filter((menu) => !menus.some((row) => row.name === menu.name));
  // Pages added to the seed later, unless a page with that address was ever made (even if trashed).
  if (had.has('site_pages') && !adding.includes('site_pages')) {
    const { rows: pages } = await sql<{ slug: string }>`SELECT slug FROM ec_site_pages`.execute(db);
    const missing = (file.content?.site_pages ?? []).filter((page) => !pages.some((row) => row.slug === page.slug));
    if (missing.length) added.site_pages = missing;
  }
  await applySeed(db, { ...file, settings: undefined, menus: newMenus, content: added }, { onConflict: 'skip', includeContent: true });
  const { rows: social } = await sql`SELECT name FROM options WHERE name = 'site:social'`.execute(db);
  if (!social.length) await setSiteSettings({ social: file.settings?.social }, db);
  for (const slug of REPLACED) if (had.has(slug)) await registry.updateCollection(slug, { hidden: true });
  await linkSquareItems(db);
  // EmDash's stock Categories and Tags, which are for blog posts.
  await sql`DELETE FROM _emdash_taxonomy_defs WHERE id IN ('taxdef_category', 'taxdef_tag')
    AND name NOT IN (SELECT name FROM taxonomies)`.execute(db);
  console.log(`[content-upgrade] version ${CONTENT_VERSION}; added: ${adding.join(', ') || 'fields only'}`);
}

/** Staff's own flavors, categories and banner take the place of the seed's. */
async function carryOver(db: any, added: Record<string, any[]>, file: SeedFile) {
  const { rows } = await sql<{ slug: string; name: string; category: string; allergens: string | null; half_gallon: number | null }>`
    SELECT slug, name, category, allergens, half_gallon FROM ec_flavors WHERE status = 'published' AND deleted_at IS NULL ORDER BY sort_order
  `.execute(db);
  const { catalog_categories: categories, catalog_flavors: flavors } = added;
  if (rows.length && categories && flavors) {
    const key = (name: string) => name.trim().toLowerCase().replace('frozen yogurt', 'yogurt');
    const idOf = (name: string) => {
      const known = categories.find((entry) => key(entry.data.name) === key(name));
      if (known) return known.id;
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const entry = { id: `cat-${slug}`, slug, status: 'published', data: { name } };
      categories.push(entry);
      file.menus?.find((menu) => menu.name === 'flavors')?.items.push({ type: 'collection', collection: 'catalog_categories', ref: entry.id, label: name });
      return entry.id;
    };
    // "Call for flavor" stood in for a list that changes; an empty category says so itself.
    added.catalog_flavors = rows.filter((row) => key(row.name) !== 'call for flavor').map((row) => ({
      id: `flavor-${row.slug}`,
      slug: row.slug,
      status: 'published',
      data: {
        name: row.name.replace(/'/g, '’'),
        category: `$ref:${idOf(row.category)}`,
        allergens: (JSON.parse(row.allergens || '[]') as string[]).map((name) => name.charAt(0).toUpperCase() + name.slice(1)),
        half_gallon: !!row.half_gallon,
      },
    }));
  }
  const { rows: site } = await sql<{ banner: string | null }>`SELECT banner FROM ec_settings WHERE slug = 'site' AND deleted_at IS NULL`.execute(db);
  const banner = site[0]?.banner?.trim();
  if (!banner || !added.schedule) return;
  const now = new Date().toISOString();
  const started = added.schedule.filter((entry) => new Date(entry.data.start_date).toISOString() <= now);
  const current = started.sort((x, y) => Date.parse(x.data.start_date) - Date.parse(y.data.start_date)).at(-1);
  if (current) current.data.banner_text = banner;
}
