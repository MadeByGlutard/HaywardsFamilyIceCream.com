import { getEmDashCollection, getEmDashEntry } from 'emdash';

export const SITE_TITLE = "Hayward's Family Ice Cream";
export const SITE_URL = 'https://haywardsfamilyicecream.com';
export const SITE_DESCRIPTION = '';

export interface SocialLink {
  label: string;
  type: string;
  url: string;
}

export interface ContactDetail {
  label: string;
  type: string;
  url: string;
  value: string;
}

export interface SiteSettings {
  banner: string;
  social: SocialLink[];
  contact: ContactDetail[];
}

export interface FlavorCategory {
  category: string;
  flavors: { name: string }[];
}

/** The single entry (slug "site") of the non-routable `settings` collection. */
export async function getSettings(): Promise<SiteSettings> {
  const { entry, error } = await getEmDashEntry('settings', 'site');
  if (error) throw error;
  if (!entry) throw new Error('Site settings are missing. Complete EmDash setup with the bundled seed.');
  const data = entry.data;
  return {
    banner: (data.banner ?? '').trim(),
    social: (data.social ?? []) as SocialLink[],
    contact: (data.contact ?? []) as ContactDetail[],
  };
}

/** Categories in display order, each with its flavors in display order. */
export async function getFlavorCategories(): Promise<FlavorCategory[]> {
  const [categories, flavors] = await Promise.all([
    getEmDashCollection('categories', { orderBy: { sort_order: 'asc' } }),
    getEmDashCollection('flavors', { orderBy: { sort_order: 'asc' } }),
  ]);
  if (categories.error) throw categories.error;
  if (flavors.error) throw flavors.error;

  const byOrder = (a: { sort_order?: number | null }, b: { sort_order?: number | null }) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0);

  return categories.entries
    .map(entry => entry.data)
    .sort(byOrder)
    .map(category => ({
      category: category.name,
      flavors: flavors.entries
        .map(entry => entry.data)
        .filter(flavor => flavor.category === category.name)
        .sort(byOrder)
        .map(flavor => ({ name: flavor.name })),
    }));
}
