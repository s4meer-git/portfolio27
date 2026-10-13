import type { APIRoute } from 'astro';
import { absolute, discoverablePages, isoDate, xml } from '@/lib/seo';
export const GET: APIRoute = ({ locals }) => new Response(
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
  discoverablePages(locals.portfolio).map(page => '<url><loc>' + xml(absolute(page.path, locals.portfolio.site)) + '</loc>' +
    (isoDate(page.updatedAt) ? '<lastmod>' + isoDate(page.updatedAt) + '</lastmod>' : '') + '</url>').join('') + '</urlset>',
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
