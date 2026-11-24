const SITE_URL = 'https://haywardsfamilyicecream.com';

const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });

const PAGES = ['/', '/flavors', '/sundaes', '/food', '/trees', '/history', '/visit'];

/** Same addresses the Gatsby site published: an index and one page set. */
export const sitemapIndex = () =>
  xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE_URL}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
  );

export const sitemapPages = () =>
  xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${PAGES.map((path) => `<url><loc>${SITE_URL}${path}</loc><changefreq>daily</changefreq></url>`).join('')}</urlset>`,
  );
