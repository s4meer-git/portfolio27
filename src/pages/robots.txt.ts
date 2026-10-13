import type { APIRoute } from 'astro';
import { absolute } from '@/lib/seo';
export const GET: APIRoute = ({ locals }) => {
  const seo = locals.portfolio.site.seo || {};
  const rules = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Allow: /api/portrait', 'Disallow: /admin/', ''];
  // Keep ordinary crawlers able to see noindex when indexing is switched off.
  // Specific bot groups must repeat restrictions: wildcard rules are not inherited.
  for (const [bot, enabled] of [['OAI-SearchBot', seo.allowAiSearch !== false], ['GPTBot', seo.allowAiTraining !== false], ['Google-Extended', seo.allowAiTraining !== false]] as const) {
    rules.push(`User-agent: ${bot}`, ...(enabled ? ['Allow: /', 'Disallow: /api/', 'Allow: /api/portrait', 'Disallow: /admin/'] : ['Disallow: /']), '');
  }
  rules.push(`Sitemap: ${absolute('/sitemap-index.xml', locals.portfolio.site)}`, '');
  return new Response(rules.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
