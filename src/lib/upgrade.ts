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
import { SchemaRegistry, setSiteSettings, ulid } from 'emdash';
import { applySeed, type SeedFile } from 'emdash/seed';
import { OptionsRepository } from 'emdash/api/route-utils';
import { getDb } from 'emdash/runtime';
import { sql } from 'kysely';
import seed from '../../seed/seed.json';
import { linkSquareItems } from './square';
import { milfordDay, seedPeriodInForce } from './schedule-dates';

/** The port's collections and the redesign's first ones: replaced, hidden from the admin, kept. */
const PORT = ['settings', 'categories', 'flavors'];
const REPLACED = [...PORT, 'pages', 'visit', 'periods', 'products', 'menu_items', 'servings', 'menu_lists'];

/** Raise when seed.json gains a collection or field, or renames a label (see renameUnedited). */
export const CONTENT_VERSION = 23;
const VERSION = 'haywards:content_version';
const LOCK = 'haywards:content_upgrade_lock';
// On D1 an upgrade takes about two minutes, one query at a time.
const LOCK_MS = 600_000;
// Other requests wait this long for it; longer than an upgrade, shorter than the lock.
const WAIT_MS = 180_000;
/** Collections this upgrade is adding, kept until it finishes so a retry can resume. */
const ADDING = 'haywards:content_upgrade_adding';

let done: Promise<void> | undefined;

/**
 * Once per Worker isolate. A failure rejects, so the middleware can hold pages back instead of
 * serving them from a half-upgraded database, and is retried on the next request.
 */
export function ensureContentModel(): Promise<void> {
  // getDb, not locals.emdash.db: EmDash leaves the database off signed-out requests.
  done ??= getDb().then(upgrade).catch((error) => {
    done = undefined;
    console.error('[content-upgrade] failed:', error);
    throw error;
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
  // A field added later lands last; Pages keep the seed's order, with the text (any length) last.
  await registry.reorderFields('site_pages', (file.collections ?? []).find((c) => c.slug === 'site_pages')!.fields.map((f) => f.slug));
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
  await renameUnedited(db);
  await splitFirstPost(db);
  await historyEnding(db);
  await footerOnlyPages(db);
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
  // The period in force today in Milford; drafts and periods with no start date yet are skipped.
  const current = seedPeriodInForce(added.schedule, milfordDay(new Date())!);
  if (current) current.data.banner_text = banner;
}

/** Labels the seed renamed, changed only where they still read the old way (staff's own edits stay). */
async function renameUnedited(db: any) {
  // Hayward's calls them frappes, not shakes.
  await sql`UPDATE ec_catalog_categories SET name = 'Frappes and floats' WHERE slug = 'shakes-and-floats' AND name = 'Shakes and floats'`.execute(db);
  await sql`UPDATE ec_site_pages SET title = 'Sundaes & frappes' WHERE slug = 'sundaes' AND title = 'Sundaes & shakes'`.execute(db);
  await sql`UPDATE _emdash_menus SET label = 'Sundaes & frappes' WHERE name = 'sundaes' AND label = 'Sundaes & shakes'`.execute(db);
  await sql`UPDATE _emdash_menu_items SET label = 'Sundaes & frappes' WHERE label = 'Sundaes & shakes'`.execute(db);
  await sql`UPDATE _emdash_menu_items SET label = 'Frappes and floats' WHERE label = 'Shakes and floats'`.execute(db);
}

/**
 * History ends on the family (Nov 2026, as Hayward's told it). Its last paragraph is swapped for
 * the seed's new section only while it still reads one of the two earlier ways; edits stay.
 */
async function historyEnding(db: any) {
  const earlier = [
    'Hayward’s in Nashua and Merrimack grew out of the same family. Today they are a separate business.',
    'Hayward’s is still in the family. Four siblings each run a stand: Sharon Robinson here in Milford, Chris in Nashua, Mike at Mike’s Ice Cream, and Diane at Hayward’s in Merrimack, which Chris owns.',
  ];
  const page = (seed.content as any).site_pages?.find((entry: any) => entry.slug === 'history');
  const ending = page?.data.content.slice(-3);
  const { rows } = await sql<{ content: string | null }>`SELECT content FROM ec_site_pages WHERE slug = 'history'`.execute(db);
  if (!ending || !rows[0]?.content) return;
  const blocks = JSON.parse(rows[0].content) as any[];
  const text = (block: any) => block?.children?.map((child: any) => child.text ?? '').join('');
  const at = blocks.findIndex((block) => earlier.includes(text(block)));
  if (at >= 0) blocks.splice(at, 1, ...ending);
  // The first version of the section, before the family's full names (also unedited only).
  const firstDraft = [
    'Sharon Robinson runs the stand on Elm Street today, and the ice cream in the case is made right here. Chris runs Hayward’s in Nashua, and Diane runs Hayward’s in Merrimack. Mike runs Mike’s Ice Cream.',
    'They’re all of the grandchildren, and every one of them stayed in ice cream.',
  ];
  // The last line as published before the family set out the generations (both unedited only).
  const lastLines = [
    'They’re all four of Charles and Fredericka Hayward’s grandchildren, and every one of them stayed in ice cream.',
    'Their grandparents, Charles and Frederika Hayward, opened the Nashua stand in 1940. All four of their grandchildren stayed in ice cream.',
  ];
  let changed = at >= 0;
  firstDraft.forEach((old, i) => {
    const found = blocks.findIndex((block) => text(block) === old);
    if (found >= 0) {
      blocks[found] = ending[i + 1];
      changed = true;
    }
  });
  // The stores paragraph before Mike's Ice Cream had its town.
  const stores = blocks.findIndex((block) => text(block) === 'Sharon Robinson runs the stand on Elm Street today, and the ice cream in the case is made right here. Chris Ordway runs Hayward’s in Nashua, and Dianne O’Donnell runs Hayward’s in Merrimack. Mike Ordway runs Mike’s Ice Cream.');
  if (stores >= 0) {
    blocks[stores] = ending[1];
    changed = true;
  }
  const last = blocks.findIndex((block) => lastLines.includes(text(block)));
  if (last >= 0) {
    blocks[last] = ending[2];
    changed = true;
  }
  if (changed) await sql`UPDATE ec_site_pages SET content = ${JSON.stringify(blocks)} WHERE slug = 'history'`.execute(db);
}

/**
 * The first post had its sources at the end of its text; posts now have a Sources field.
 * Moves them over, only while the post still has its sources in the text and none of its own.
 */
async function splitFirstPost(db: any) {
  const post = (seed.content as any).posts?.find((entry: any) => entry.slug === 'milkshake-vs-frappe');
  if (!post) return;
  const { rows } = await sql<{ content: string | null }>`
    SELECT content FROM ec_posts WHERE slug = 'milkshake-vs-frappe' AND sources IS NULL AND photo IS NULL`.execute(db);
  const content = rows[0]?.content;
  if (!content || !content.includes('"Sources"')) return;
  await sql`UPDATE ec_posts SET content = ${JSON.stringify(post.data.content)}, sources = ${JSON.stringify(post.data.sources)},
    photo = ${post.data.photo ? JSON.stringify(post.data.photo) : null} WHERE slug = 'milkshake-vs-frappe' AND sources IS NULL`.execute(db);
}

/**
 * Pages are footer-only unless ticked "Show in the top menu". Pages already in Main navigation
 * keep their place in the top menu (once, while no page is ticked yet), and Join our team and
 * Blog, which the footer used to add by itself, join Main navigation.
 */
async function footerOnlyPages(db: any) {
  const { rows: menus } = await sql<{ id: string }>`SELECT id FROM _emdash_menus WHERE name = 'primary'`.execute(db);
  const menu = menus[0]?.id;
  if (!menu) return;
  const { rows: ticked } = await sql<{ n: number }>`SELECT count(*) AS n FROM ec_site_pages WHERE top_menu = 1`.execute(db);
  if (!Number(ticked[0]?.n)) {
    await sql`UPDATE ec_site_pages SET top_menu = 1 WHERE slug NOT IN ('jobs', 'blog') AND id IN (
      SELECT reference_id FROM _emdash_menu_items WHERE menu_id = ${menu} AND reference_collection = 'site_pages')`.execute(db);
  }
  const { rows: last } = await sql<{ n: number | null }>`SELECT max(sort_order) AS n FROM _emdash_menu_items WHERE menu_id = ${menu}`.execute(db);
  let order = Number(last[0]?.n ?? -1);
  for (const [slug, label] of [['jobs', 'Join our team'], ['blog', 'Blog']]) {
    const { rows } = await sql<{ id: string; listed: number }>`
      SELECT p.id, (SELECT count(*) FROM _emdash_menu_items i WHERE i.menu_id = ${menu} AND i.reference_id = p.id) AS listed
      FROM ec_site_pages p WHERE p.slug = ${slug} AND p.deleted_at IS NULL`.execute(db);
    if (!rows[0] || Number(rows[0].listed)) continue;
    const id = ulid();
    order += 1;
    await sql`INSERT INTO _emdash_menu_items (id, menu_id, parent_id, sort_order, type, reference_collection, reference_id, label, created_at, locale, translation_group)
      VALUES (${id}, ${menu}, NULL, ${order}, 'collection', 'site_pages', ${rows[0].id}, ${label}, ${new Date().toISOString()}, 'en', ${id})`.execute(db);
  }
}
