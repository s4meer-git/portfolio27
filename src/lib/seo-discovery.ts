import type { Portfolio } from './cms';
import { absolute, discoverablePages, identity, pagePolicy, pageRecords, plainText, originFor } from './seo';
export function discoveryText(p: Portfolio, full = false) {
  const { site } = p;
  const seo = site.seo || {};
  if (seo.llmsEnabled === false || seo.indexingEnabled === false) return;
  const visible = discoverablePages(p);
  const home = pageRecords(p).find(page => page.path === '/')!;
  const profileVisible = pagePolicy(p, home).includeInSitemap;
  const id = identity(site);
  const rows = [`# ${seo.siteName || id.name}`, '', `Canonical website: ${originFor(site)}`, ''];
  if (profileVisible) rows.push(`> ${plainText(site.profile.role || seo.desc || '')}`, '', plainText(site.profile.about || seo.desc || ''), '',
    ...(id.aliases.length ? [`Also known as: ${id.aliases.join(', ')}`, ''] : []),
    '## Official websites', `- [${new URL(originFor(site)).hostname}](${originFor(site)})`,
    ...id.domains.map(domain => `- [${domain.label}](${domain.url})${domain.description ? ': ' + plainText(domain.description) : ''}`), '',
    ...(id.sameAs.length ? ['## Official profiles', ...id.sameAs.map(url => `- ${url}`), ''] : []));
  rows.push('## Pages');
  for (const page of visible) {
    const metadata = pagePolicy(p, page);
    const title = metadata.title || page.title;
    const description = metadata.description || page.description;
    rows.push(`- [${title.replace(/[\[\]\r\n]/g, ' ')}](${absolute(page.path, site)})${full && description ? ': ' + plainText(description) : ''}`);
  }
  return rows.join('\n') + '\n';
}
