import type { APIRoute } from 'astro';
import { sitemapIndex } from '../lib/sitemap';

// The URL gatsby-plugin-sitemap used.
export const GET: APIRoute = () => sitemapIndex();
