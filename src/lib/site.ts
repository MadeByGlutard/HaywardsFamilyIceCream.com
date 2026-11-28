import { getEmDashCollection, getEmDashEntry, getSiteSettings } from 'emdash';

/** Social links are saved in Settings as a username; a full address works too. */
const profile = (site: string, value: string | undefined) => {
  const name = value?.trim().replace(/^@/, '');
  return name ? (/^https?:/.test(name) ? name : `${site}/${name}`) : undefined;
};

/** Store info, with the directions link and the social links from Settings. */
export async function getLocation() {
  const [{ entry }, settings] = await Promise.all([getEmDashEntry('store', 'milford'), getSiteSettings()]);
  if (!entry) throw new Error('Store info is missing. Complete EmDash setup with the bundled seed.');
  const { address, locality } = entry.data;
  return {
    edit: entry.edit,
    data: {
      ...entry.data,
      facebook: profile('https://www.facebook.com', settings.social?.facebook),
      instagram: profile('https://www.instagram.com', settings.social?.instagram),
      directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`Hayward's Ice Cream of Milford, ${address}, ${locality}`)}`,
    },
  };
}
/** A page's entry in Pages: its headline (or name) and introduction. */
export async function getPage(slug: string) {
  const { entry } = await getEmDashEntry('site_pages', slug);
  if (!entry) return undefined;
  const { title, headline } = entry.data;
  return { ...entry, headline: headline || title, headlineEdit: headline ? entry.edit.headline : entry.edit.title };
}
export type SitePage = NonNullable<Awaited<ReturnType<typeof getPage>>>;
export const telephone = (value: string) => `tel:+1${value.replace(/\D/g, '')}`;

/**
 * The band a page ends on, from its "Band at the bottom" fields. A page without one, or whose band
 * links to an unpublished page, ends on the Hours & directions page's band instead.
 */
export async function endBand(page?: SitePage) {
  const { entries } = await getEmDashCollection('site_pages', { limit: 100 });
  const published = new Set(entries.map((entry: any) => entry.id));
  const usable = (entry: any) => {
    const { band_headline: headline, band_button: label, band_link: url } = entry?.data ?? {};
    if (!headline || !label || !url) return false;
    const slug = url.match(/^\/([^/?#]*)/)?.[1];
    return slug === undefined || slug === '' || published.has(slug);
  };
  const visit = entries.find((entry: any) => entry.id === 'visit');
  const chosen: any = usable(page) ? page : usable(visit) ? visit : undefined;
  return chosen && { headline: chosen.data.band_headline as string, label: chosen.data.band_button as string, url: chosen.data.band_link as string, edit: chosen.edit.band_headline };
}

/** A summary with its "{flavors}" placeholder (the number of ice cream flavors) filled in. */
export const fillSummary = (text: string | undefined, counts: { flavors?: number } = {}) =>
  (text ?? '').replace(/\{flavors\}/g, String(counts.flavors ?? ''));
