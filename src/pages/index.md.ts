import type { APIRoute } from 'astro';
import { discoveryText } from '@/lib/seo-discovery';
import { absolute } from '@/lib/seo';
export const GET: APIRoute = ({ locals }) => {
  const text = discoveryText(locals.portfolio, true);
  return new Response(text ?? 'Not found', { status: text ? 200 : 404, headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'X-Robots-Tag': 'noindex', Link: `<${absolute('/', locals.portfolio.site)}>; rel="canonical"` } });
};
