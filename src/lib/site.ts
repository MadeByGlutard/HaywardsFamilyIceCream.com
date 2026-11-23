import { getEmDashCollection, getEmDashEntry } from 'emdash';
export async function getLocation() {
  const { entry } = await getEmDashEntry('visit', 'milford');
  if (!entry) throw new Error('Location content is missing. Complete EmDash setup with the bundled seed.');
  return entry;
}
export const telephone = (value: string) => `tel:+1${value.replace(/\D/g, '')}`;

/**
 * Flavor categories in the order staff set in EmDash. The names are the values
 * stored on each flavor; display labels are sentence case (`categoryLabels`).
 */
export async function getCategories(): Promise<string[]> {
  const { entries } = await getEmDashCollection('categories', { orderBy: { sort_order: 'asc' } });
  return entries.map((entry) => entry.data.name);
}

/** "Call for flavor" stands in for a list that changes often; it isn't a flavor. */
export const isNamedFlavor = (name: string) => name.trim().toLowerCase() !== 'call for flavor';

/** The banner staff type into Site settings, and its visual-editing attributes. */
export async function getBanner() {
  const { entry } = await getEmDashEntry('settings', 'site');
  return { text: entry?.data.banner?.trim() || undefined, edit: entry?.edit.banner as Record<string, string> | undefined };
}
const categoryLabels: Record<string, string> = {
  'ice cream': 'Ice cream',
  yogurt: 'Frozen yogurt',
  sherbet: 'Sherbet',
  sorbet: 'Sorbet',
  vegan: 'Vegan',
  'no sugar added': 'No sugar added',
};
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
/** Sentence-case display label for a stored category value. */
export const categoryLabel = (value: string) => {
  const key = normalize(value);
  return categoryLabels[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
};
/** Compare categories without depending on stored capitalisation. */
export const sameCategory = (a: string | undefined, b: string) => !!a && normalize(a) === normalize(b);
/** Stable anchor id (#ice-cream, #no-sugar-added) for a category. */
export const categoryId = (value: string) => normalize(value).replace(/\s+/g, '-');
export const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
