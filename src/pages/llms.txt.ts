import type { APIRoute } from 'astro';
import { discoveryText } from '@/lib/seo-discovery';
export const GET: APIRoute = ({ locals }) => {
  const text = discoveryText(locals.portfolio);
  return new Response(text ?? 'Not found', { status: text ? 200 : 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
};
