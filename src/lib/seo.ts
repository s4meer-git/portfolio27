/** One source of truth for HTML metadata, discovery documents and URL policy. */
import type { Portfolio } from './cms';

export const DEFAULT_ORIGIN = 'https://s4meer.com';
export const lines = (value?: string) => [...new Set((value || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
export function httpUrl(value?: string, base?: string): string | undefined {
  if (!value?.trim()) return;
  try {
    const url = new URL(value.trim(), base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
    return url.href;
  } catch { return; }
}
export const pathKey = (path: string) => path.replace(/\/+$/, '') || '/';
export function originFor(site: any) {
  return new URL(httpUrl(site.seo?.canonicalOrigin) || DEFAULT_ORIGIN).origin;
}
export function absolute(path: string, site: any) { return new URL(path, originFor(site)).href; }
export function plainText(value = '') {
  return value.replace(/<[^>]*>/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_`~]/g, '').replace(/\s+/g, ' ').trim();
}
export function ownedDomains(site: any) {
  return (site.seo?.ownedDomains || []).flatMap((item: any) => {
    const url = httpUrl(item.url?.includes('://') ? item.url : `https://${item.url || ''}`);
    return url ? [{ ...item, url: new URL(url).origin, label: item.label || new URL(url).hostname }] : [];
  });
}
export function identity(site: any) {
  const seo = site.seo || {};
  return {
    name: seo.author || site.profile.displayName || seo.siteName,
    aliases: lines(seo.alternateNames),
    // Only explicit identity links; socialLinks can contain CVs and unrelated destinations.
    sameAs: lines(seo.sameAs).map(url => httpUrl(url)).filter(Boolean) as string[],
    domains: ownedDomains(site),
  };
}
export type PageRecord = { path: string; title: string; description?: string; kind: string;
  data?: any; parent?: string; updatedAt?: string; pageNumber?: number };
export function pageRecords(p: Portfolio): PageRecord[] {
  const { site } = p;
  const seo = site.seo || {};
  const records: PageRecord[] = [
    { path: '/', title: seo.title || site.profile.displayName, description: seo.desc, kind: 'profile', updatedAt: site.updatedAt },
    { path: '/about', title: `${seo.aboutTitle || 'About'} ${site.profile.displayName}`, description: seo.desc || plainText(site.profile.about), kind: 'profile', updatedAt: site.updatedAt },
    { path: '/sitemap', title: seo.sitemapTitle || 'Site map', description: `Browse ${site.profile.displayName}’s website.`, kind: 'directory' },
  ];
  for (const [key, labelKey, perPageKey, kind] of [
    ['articles', 'articleLabels', 'articlesPerPage', 'article'],
    ['journal', 'articleLabels', 'articlesPerPage', 'article'],
    ['publications', 'publicationLabels', 'publicationsPerPage', 'publication'],
    ['projects', 'projectLabels', '', 'project'],
  ]) {
    const items = key === 'journal' ? p.articles.filter(entry => entry.data.contentKind === 'personal') : key === 'articles' ? p.articles.filter(entry => entry.data.contentKind !== 'personal') : (p as any)[key] || [];
    const title = (key === 'journal' ? site.articleLabels?.journalTitle : site[labelKey]?.pageTitle) || key[0].toUpperCase() + key.slice(1);
    const description = key === 'journal' ? site.articleLabels?.journalDescription : site[labelKey]?.pageDescription;
    const pageSize = Math.max(1, Number(site[perPageKey]) || (key === 'articles' ? 6 : 10));
    const count = perPageKey ? Math.max(1, Math.ceil(items.length / pageSize)) : 1;
    for (let n = 1; n <= count; n++) records.push({ path: `/${key}${n > 1 ? '/' + n : ''}`, title: title + (n > 1 ? ` — Page ${n}` : ''), description, kind: 'collection', parent: n > 1 ? `/${key}` : '/', pageNumber: n });
    for (const item of items) records.push({ path: `/${key}/${encodeURIComponent(item.id)}`, title: item.data.title || item.data.name, description: item.data.description, kind, data: item.data, parent: `/${key}`, updatedAt: item.data.updatedAt });
  }
  for (const [key, relation] of [['categories', 'category'], ['series', 'series']]) {
    for (const item of (p as any)[key] || []) {
      if (p.articles.some(article => article.data.contentKind !== 'personal' && article.data[relation]?.slug === item.slug)) records.push({ path: `/articles/${key}/${encodeURIComponent(item.slug)}`, title: item.name, description: item.description, kind: 'collection', data: item, parent: '/articles', updatedAt: item.updatedAt });
    }
  }
  for (const item of p.categories || []) {
    if (p.publications.some(publication => publication.data.category?.slug === item.slug)) records.push({
      path: `/publications/categories/${encodeURIComponent(item.slug)}`, title: item.name,
      description: item.description || site.publicationLabels?.categoryPageDescription?.replace('{name}', item.name),
      kind: 'collection', data: item, parent: '/publications', updatedAt: item.updatedAt,
    });
  }
  return records;
}
export function pagePolicy(p: Portfolio, record: PageRecord) {
  const seo = p.site.seo || {};
  const override = seo.pages?.find((page: any) => pathKey(page.path || '') === record.path)?.metadata;
  // Blank overrides inherit useful defaults; booleans explicitly override.
  const nonblank = (value: any) => Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== null && v !== undefined && v !== ''));
  const fields: any = { ...nonblank(record.data?.seo), ...nonblank(override) };
  const ownUrl = absolute(record.path, p.site);
  const canonical = httpUrl(fields.canonicalUrl, originFor(p.site)) || ownUrl;
  const noindex = seo.indexingEnabled === false || fields.noindex === true;
  return { ...fields, canonical, noindex, includeInSitemap: !noindex && fields.includeInSitemap !== false && canonical === ownUrl };
}
export function discoverablePages(p: Portfolio) {
  return pageRecords(p).filter(record => pagePolicy(p, record).includeInSitemap && !redirectTarget(p.site, record.path));
}
export function breadcrumbs(p: Portfolio, record: PageRecord) {
  if (record.path === '/') return [];
  const all = pageRecords(p);
  const parents: PageRecord[] = [];
  let parent = record.parent;
  const seen = new Set([record.path]);
  while (parent && parent !== '/' && !seen.has(parent)) {
    seen.add(parent);
    const found = all.find(page => page.path === parent);
    if (!found) break;
    parents.unshift(found); parent = found.parent;
  }
  return [{ path: '/', title: p.site.seo?.homeLabel || 'Home' }, ...parents, record];
}
export function pageMetadata(p: Portfolio, pathname: string, fallback: any = {}) {
  const path = pathKey(pathname);
  const record = pageRecords(p).find(page => page.path === path) || { path, title: fallback.title || p.site.seo?.title || p.site.profile.displayName, description: fallback.description, kind: 'page' };
  const seo = p.site.seo || {};
  const policy = pagePolicy(p, record);
  const id = identity(p.site);
  const siteName = seo.siteName || id.name;
  const baseTitle = policy.title || record.title;
  const title = path === '/' ? baseTitle : (seo.titleTemplate || '%s | %n').replace(/%s/g, () => baseTitle).replace(/%n/g, () => siteName);
  const description = plainText(policy.description || record.description || fallback.description || seo.desc || p.site.profile.about || '');
  const image = httpUrl(policy.socialImage || record.data?.image || fallback.ogImage || seo.ogImage, originFor(p.site));
  const imageAlt = policy.imageAlt || seo.ogImageAlt || baseTitle;
  const crumbs = breadcrumbs(p, record);
  const personId = absolute('/#person', p.site);
  const websiteId = absolute('/#website', p.site);
  const person: any = {
    '@type': 'Person', '@id': personId, name: id.name, url: absolute('/', p.site),
    ...(id.aliases.length && { alternateName: id.aliases }),
    ...(id.sameAs.length && { sameAs: id.sameAs }),
    ...(p.site.profile.role && { jobTitle: p.site.profile.role }),
    ...(p.site.profile.about && { description: plainText(p.site.profile.about) }),
    image: absolute('/api/portrait', p.site),
  };
  const pageId = `${policy.canonical}#webpage`;
  const graph: any[] = [person, {
    '@type': 'WebSite', '@id': websiteId, url: absolute('/', p.site), name: siteName,
    inLanguage: seo.language || 'en', publisher: { '@id': personId },
  }, {
    '@type': record.kind === 'profile' ? 'ProfilePage' : ['collection', 'directory'].includes(record.kind) ? 'CollectionPage' : 'WebPage',
    '@id': pageId, url: policy.canonical, name: baseTitle, description,
    isPartOf: { '@id': websiteId }, inLanguage: seo.language || 'en',
    ...(record.kind === 'profile' && { mainEntity: { '@id': personId } }),
    ...(crumbs.length && { breadcrumb: { '@id': `${policy.canonical}#breadcrumb` } }),
  }];
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', '@id': `${policy.canonical}#breadcrumb`, itemListElement: crumbs.map((crumb, index) => ({ '@type': 'ListItem', position: index + 1, name: crumb.title, item: absolute(crumb.path, p.site) })) });
  if (['article', 'publication', 'project'].includes(record.kind)) {
    const data = record.data;
    const type = record.kind === 'article' ? 'BlogPosting' : record.kind === 'publication' ? 'ScholarlyArticle' : 'CreativeWork';
    const authors = record.kind === 'publication' ? (data.authors || '').split(',').map((name: string) => name.trim()).filter(Boolean).map((name: string) => name === id.name ? { '@id': personId } : { '@type': 'Person', name }) : [{ '@id': personId }];
    graph.push({ '@type': type, '@id': `${policy.canonical}#work`, url: policy.canonical,
      name: record.title, headline: record.title, description,
      mainEntityOfPage: { '@id': pageId }, ...(image && { image: [image] }),
      ...(authors.length && { author: authors }),
      ...(isoDate(data.pubDatetime || data.publishedOn) && { datePublished: isoDate(data.pubDatetime || data.publishedOn) }),
      ...(isoDate(data.updatedAt) && { dateModified: isoDate(data.updatedAt) }),
      ...(data.tags?.length && { keywords: data.tags.join(', ') }),
      ...(record.kind === 'publication' && data.doi && { identifier: data.doi }),
    });
    graph[2].mainEntity = { '@id': `${policy.canonical}#work` };
  }
  return { record, ...policy, title, description, image, imageAlt, siteName, author: id.name, crumbs,
    ogType: ['article', 'publication'].includes(record.kind) ? 'article' : 'website',
    robots: `${policy.noindex ? 'noindex' : 'index'}, ${policy.nofollow ? 'nofollow' : 'follow'}, max-image-preview:large, max-snippet:-1, max-video-preview:-1`,
    structuredData: { '@context': 'https://schema.org', '@graph': graph } };
}
export function isoDate(value: any) {
  if (!value) return;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
/** Exact same-site redirects only. Reject cycles and reserved technical endpoints. */
export function redirectTarget(site: any, path: string): string | undefined {
  const valid = (s: string) => typeof s === 'string' && /^\/(?!\/)/.test(s) && !/[?#\\\s]/.test(s) && !/^\/(api|_astro)(\/|$)/.test(s) && !['/robots.txt','/sitemap.xml','/sitemap-index.xml','/llms.txt','/index.md'].includes(s);
  const rules = (site.seo?.redirects || []).filter((r: any) => r.enabled !== false && valid(r.fromPath) && valid(r.toPath));
  let current = pathKey(path);
  const seen = new Set([current]);
  for (let i = 0; i <= rules.length; i++) {
    const rule = rules.find((r: any) => pathKey(r.fromPath) === current);
    if (!rule) return current !== pathKey(path) ? current : undefined;
    current = pathKey(rule.toPath);
    if (seen.has(current)) return;
    seen.add(current);
  }
}
export function xml(value: string) { return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]!)); }
