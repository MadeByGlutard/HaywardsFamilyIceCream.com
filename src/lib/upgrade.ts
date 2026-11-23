/**
 * Brings a database that is already set up to the content model in seed/seed.json.
 *
 * EmDash applies the seed during setup only. Afterwards, a collection added to the
 * seed would never reach production or a preview copied from it. This runs EmDash's
 * own seed code once per CONTENT_VERSION, and only ever adds:
 *   - new collections, and new fields on existing ones;
 *   - the starting entries of collections the database did not have before.
 * Entries staff already have are left alone.
 */
import { SchemaRegistry } from 'emdash';
import { applySeed, type SeedFile } from 'emdash/seed';
import { OptionsRepository } from 'emdash/api/route-utils';
import { getDb } from 'emdash/runtime';
import { sql } from 'kysely';
import seed from '../../seed/seed.json';

/** Raise when seed.json gains a collection or field. */
export const CONTENT_VERSION = 3;
const VERSION = 'haywards:content_version';
const LOCK = 'haywards:content_upgrade_lock';
// On D1 an upgrade takes about 25 seconds, one query at a time.
const LOCK_MS = 120_000;
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

  // One isolate at a time; a crashed one frees the lock after a minute.
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
  const file = seed as unknown as SeedFile;
  const { rows: existing } = await sql<{ slug: string }>`SELECT slug FROM _emdash_collections`.execute(db);
  const had = new Set(existing.map((row) => row.slug));
  // An interrupted run leaves some of these created but empty, so go by its list.
  const resumed = (await options.get(ADDING)) as string[] | null;
  const adding = Array.isArray(resumed) ? resumed : (file.collections ?? []).map((c) => c.slug).filter((slug) => !had.has(slug));
  await options.set(ADDING, adding);
  const added = Object.fromEntries(Object.entries(file.content ?? {}).filter(([slug]) => adding.includes(slug)));

  // Seed "skip" leaves existing collections alone entirely, and "update" would overwrite
  // labels and choices staff changed, so missing fields are added one by one.
  const registry = new SchemaRegistry(db);
  for (const collection of file.collections ?? []) {
    if (!had.has(collection.slug)) continue;
    for (const field of collection.fields)
      if (!(await registry.getField(collection.slug, field.slug))) await registry.createField(collection.slug, { ...field, required: false } as any);
  }
  await applySeed(db, { ...file, settings: undefined, content: added }, { onConflict: 'skip', includeContent: true });
  console.log(`[content-upgrade] version ${CONTENT_VERSION}; added: ${adding.join(', ') || 'fields only'}`);
}
