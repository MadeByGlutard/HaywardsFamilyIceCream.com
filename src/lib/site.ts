import { getEmDashEntry, getSiteSettings } from 'emdash';

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
