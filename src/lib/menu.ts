import { getEmDashCollection } from 'emdash';

/**
 * The menu's pages and the groups on each, in order. A group's sections are the
 * values stored in `menu_items.section`. `/menu` is the flavors page.
 */
export const menuPages = {
  '/menu': [
    { heading: 'Sizes', sections: ['Sizes'] },
    { heading: 'Cones and toppings', sections: ['Cones and toppings'] },
  ],
  '/menu/sundaes': [
    { heading: 'Sundaes', sections: ['Sundaes'] },
    { heading: 'Shakes and floats', sections: ['Shakes and floats'] },
    { heading: 'Twisters and treats', sections: ['Twisters and treats'] },
    { heading: 'Take home', sections: ['Take home'] },
  ],
  '/menu/food': [
    { heading: 'Hot dogs', sections: ['Hot dogs'] },
    { heading: 'Melts', sections: ['Melts'] },
    { heading: 'Rolls, wraps and subs', sections: ['Rolls, wraps and subs'] },
    { heading: 'Mac, chili and sides', sections: ['Mac, chili and sides'] },
    { heading: 'Drinks', sections: ['Cold drinks', 'Hot drinks'] },
  ],
} as const;
export type MenuPage = keyof typeof menuPages;

/** One page's groups with their items; empty groups are left out. */
export async function menuGroups(page: MenuPage) {
  const { entries } = await getEmDashCollection('menu_items', { orderBy: { sort_order: 'asc' }, limit: 300 });
  return menuPages[page]
    .map(({ heading, sections }) => {
      const items = sections.flatMap((section) => (entries ?? []).filter((item) => item.data.section === section));
      return { heading, items, shared: sharedOptions(items.map((item) => item.data.options)) };
    })
    .filter((group) => group.items.length > 0);
}

/** Options three or more rows repeat ("24-inch"): said once, by the heading. */
export function sharedOptions(options: (string | undefined | null)[]) {
  return options.find((value) => value && options.filter((other) => other === value).length >= 3) ?? undefined;
}
