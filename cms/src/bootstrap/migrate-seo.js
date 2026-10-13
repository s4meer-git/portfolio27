/** One-time identity setup. Preserve published content and any separate draft. */
const KEY = 'seo-identity-s4meer-v1';
const DOMAINS = ['sameerchauhan.com', 'sameerchauhan.in', 'sameer.com', 'sameer.in', 'sameerchauhan.de', 'sameerbitspilani.com', 'sameermanipal.com'];

function population(strapi, uid) {
  const attributes = (strapi.contentTypes[uid] || strapi.components[uid]).attributes;
  return Object.fromEntries(Object.entries(attributes).flatMap(([key, field]) => {
    if (field.type === 'component') return [[key, { populate: population(strapi, field.component) }]];
    if (field.type === 'media' || field.type === 'relation' && !key.endsWith('By')) return [[key, true]];
    return [];
  }));
}
function writable(strapi, uid, value) {
  const attributes = (strapi.contentTypes[uid] || strapi.components[uid]).attributes;
  return Object.fromEntries(Object.entries(attributes).flatMap(([key, field]) => {
    if (['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(key) || value[key] === undefined) return [];
    const current = value[key];
    if (current == null) return [[key, null]];
    if (field.type === 'component') return [[key, field.repeatable ? current.map(item => writable(strapi, field.component, item)) : writable(strapi, field.component, current)]];
    if (field.type === 'media') return [[key, field.multiple ? current.map(item => item.id) : current.id]];
    if (field.type === 'relation') return [[key, Array.isArray(current) ? current.map(item => item.documentId) : current.documentId]];
    return [[key, current]];
  }));
}
module.exports = async function migrateSeo(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return;
  const uid = 'api::site-setting.site-setting';
  const docs = strapi.documents(uid);
  const populate = population(strapi, uid);
  const published = await docs.findFirst({ status: 'published', populate });
  if (!published) return;
  const draft = await docs.findOne({ documentId: published.documentId, status: 'draft', populate });
  const defaults = seo => ({
    ...seo,
    canonicalOrigin: seo?.canonicalOrigin || 'https://s4meer.com',
    siteName: seo?.siteName || published.profile?.displayName || 'Sameer Chauhan',
    profile: 'https://s4meer.com',
    ownedDomains: seo?.ownedDomains?.length ? seo.ownedDomains : DOMAINS.map(domain => ({ url: `https://${domain}`, label: domain, relationship: 'alias', redirectToPrimary: true })),
  });
  const liveData = writable(strapi, uid, published);
  const draftData = draft && writable(strapi, uid, draft);
  // Send the complete published snapshot so an unrelated pending draft is not published.
  // Restore that draft afterwards. All component/media references are normalized above.
  await strapi.db.transaction(async () => {
    await docs.update({ documentId: published.documentId, status: 'published', data: { ...liveData, seo: defaults(liveData.seo) } });
    if (draftData) await docs.update({ documentId: published.documentId, status: 'draft', data: { ...draftData, seo: defaults(draftData.seo) } });
    await store.set({ key: KEY, value: true });
  });
  strapi.log.info('Configured CMS SEO identity and owned domains; preserved the separate draft.');
};
