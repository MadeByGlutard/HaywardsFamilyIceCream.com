import type { APIRoute } from 'astro';
import { sitemapPages } from '../lib/sitemap';

export const GET: APIRoute = () => sitemapPages();
