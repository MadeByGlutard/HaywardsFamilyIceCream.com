/** Menu helpers without EmDash imports, so tests can use them. */

/** Options three or more rows repeat ("24-inch"): said once, by the heading. */
export function sharedOptions(options: (string | undefined | null)[]) {
  return options.find((value) => value && options.filter((other) => other === value).length >= 3) ?? undefined;
}

/** Flavors in alphabetical order. S’mores sorts as "smores". */
export const byName = <T extends { data: { name: string } }>(entries: T[]) =>
  [...entries].sort((a, b) => a.data.name.localeCompare(b.data.name, 'en', { ignorePunctuation: true }));
