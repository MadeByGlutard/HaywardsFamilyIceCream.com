/**
 * Public pages are identical for every visitor, so shared caches (Cloudflare's
 * edge) may keep them for 5 minutes and browsers for 1 minute. A banner or
 * flavor edit published in the admin is therefore live everywhere within about
 * 5 minutes without a rebuild or purge. The daily gallery pick changes at
 * midnight America/New_York, at most 5 minutes late. See README "Caching".
 *
 * EmDash replaces this with `private, no-store` on responses it decorates for
 * logged-in editors, so editors always see fresh pages.
 */
export const PUBLIC_CACHE_CONTROL = 'public, max-age=60, s-maxage=300';
