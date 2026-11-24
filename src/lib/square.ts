import { sql } from 'kysely';
import ids from '../../seed/square-ids.json';

/**
 * Square IDs live in the admin plugin's own storage, keyed by entry, not in the content:
 * nobody can edit them, and duplicating an entry or restoring a revision can't carry one along.
 */
export async function linkSquareItems(db: any) {
  await sql`
    INSERT INTO _plugin_storage (plugin_id, collection, id, data)
    SELECT 'haywards-admin', 'square', items.id, json_object('squareId', ids.value)
    FROM json_each(${JSON.stringify(ids)}) ids JOIN ec_catalog_items items ON items.slug = ids.key
    WHERE true ON CONFLICT (plugin_id, collection, id) DO NOTHING
  `.execute(db);
}
