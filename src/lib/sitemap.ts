import { SITE_URL } from './content';

const xml = (body: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?>${body}`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });

/** Same documents gatsby-plugin-sitemap produced: an index and one page set. */
export const sitemapIndex = () =>
  xml(
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE_URL}/sitemap-0.xml</loc></sitemap></sitemapindex>`,
  );

export const sitemapPages = () =>
  xml(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>0.7</priority></url></urlset>`,
  );
