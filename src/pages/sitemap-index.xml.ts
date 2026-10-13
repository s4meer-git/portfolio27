import type { APIRoute } from 'astro';
import { absolute, xml } from '@/lib/seo';
export const GET: APIRoute = ({ locals }) => new Response(
  '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>' + xml(absolute('/sitemap.xml', locals.portfolio.site)) + '</loc></sitemap></sitemapindex>',
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
