import type { APIRoute } from 'astro';
import { sitemapIndex } from '../lib/sitemap';

// Overrides EmDash's collection sitemap (no collection is routable here).
export const GET: APIRoute = () => sitemapIndex();
