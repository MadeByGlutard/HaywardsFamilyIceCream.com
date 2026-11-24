import { getDb } from 'emdash/runtime';
import { sql } from 'kysely';

/**
 * Every flavor's and menu item's category, in the order staff dragged them into. EmDash
 * reads references one entry at a time; a menu page needs all of them.
 */
export async function categoryLinks() {
  const { rows } = await sql<{ category: string; entry: string }>`
    SELECT links.parent_group AS category, links.child_group AS entry
    FROM _emdash_content_references links
    JOIN _emdash_relations relations ON relations.id = links.relation_id
    WHERE relations.slug IN ('flavor_category', 'item_category')
    ORDER BY links.sort_order
  `.execute(await getDb());
  return rows;
}
