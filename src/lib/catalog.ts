import { getEmDashCollection, getMenu } from 'emdash';
import { categoryLinks } from './catalog-links';
import { byName, sharedOptions } from './catalog-text';

/** EmDash menus of categories, beside the site's navigation (`primary`). */
export type MenuName = 'flavors' | 'sundaes' | 'food' | 'trees';

/** One menu's categories, in order, each with its flavors and menu items. */
export async function menuCategories(name: MenuName) {
  const [menu, { entries: categories }, { entries: flavors }, { entries: items }, links] = await Promise.all([
    getMenu(name),
    getEmDashCollection('catalog_categories', { limit: 100 }),
    getEmDashCollection('catalog_flavors', { limit: 500 }),
    getEmDashCollection('catalog_items', { limit: 500 }),
    categoryLinks(),
  ]);
  // A menu item links to its category, so the address ends in the category's slug.
  const slugs = (menu?.items ?? []).map((item) => item.url.replace(/\/+$/, '').split('/').at(-1));
  return slugs
    .flatMap((slug) => categories.filter((category) => category.id === slug))
    .map((category) => {
      const order = new Map(links.filter((link) => link.category === category.data.id).map((link, i) => [link.entry, i]));
      const own = items.filter((item) => order.has(item.data.id)).sort((a, b) => order.get(a.data.id)! - order.get(b.data.id)!);
      return {
        slug: category.id,
        name: category.data.name,
        edit: category.edit,
        flavors: byName(flavors.filter((flavor) => order.has(flavor.data.id))),
        items: own,
        shared: sharedOptions(own.map((item) => item.data.options)),
      };
    });
}
export type MenuCategory = Awaited<ReturnType<typeof menuCategories>>[number];

/**
 * Splits a list into `count` runs, in order, so the longest run is as short as possible
 * (weights are each item's length). Used to lay a menu's categories out in columns.
 */
export function splitEvenly<T>(list: T[], count: number, weight: (item: T) => number): T[][] {
  const n = list.length;
  const k = Math.max(1, Math.min(count, n));
  const sums = [0];
  for (const item of list) sums.push(sums.at(-1)! + weight(item));
  // best[j][i]: the smallest longest run when the first i items go into j runs.
  const best = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const cut = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let j = 1; j <= k; j++)
    for (let i = j; i <= n; i++)
      for (let m = j - 1; m < i; m++) {
        const longest = Math.max(best[j - 1][m], sums[i] - sums[m]);
        if (longest < best[j][i]) { best[j][i] = longest; cut[j][i] = m; }
      }
  const runs: T[][] = [];
  for (let j = k, i = n; j > 0; i = cut[j][i], j--) runs.unshift(list.slice(cut[j][i], i));
  return runs;
}
