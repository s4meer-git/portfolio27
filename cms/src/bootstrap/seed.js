const fs = require('fs');
const path = require('path');

const KEY = 'seed-v1';

/** Import local seed media from the CMS or website public directory. */
function createUploader(strapi) {
  const cache = new Map();
  async function importFile(url) {
    const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { url } });
    if (existing) return existing;
    const roots = [path.resolve(process.cwd(), 'public'), path.resolve(process.cwd(), '../public')];
    const filepath = roots.map(root => ({ root, file: path.resolve(root, '.' + url) }))
      .find(({ root, file }) => file.startsWith(root + path.sep) && fs.existsSync(file) && fs.statSync(file).isFile())?.file;
    if (!filepath) return null;
    const ext = path.extname(filepath).toLowerCase();
    const mimetype =
      {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
      }[ext] || 'application/octet-stream';
    const name = path.basename(filepath);
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name, alternativeText: name } },
        files: { filepath, originalFilename: name, mimetype, size: fs.statSync(filepath).size },
      });
    return file;
  }
  return function upload(url) {
    if (typeof url !== 'string' || !url.startsWith('/')) return Promise.resolve(null);
    // Cache the in-flight import too: nested components can share the same logo.
    if (!cache.has(url)) cache.set(url, importFile(url));
    return cache.get(url);
  };
}

module.exports = async function seed(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return false;

  const content = require(path.join(process.cwd(), 'seed/content.json'));
  const upload = createUploader(strapi);

  // Every media field follows the same import path, including nested portrait
  // variants, shirt logos, organisation logos, and sharing metadata.
  async function importMedia(uid, value) {
    if (!value) return value;
    const attributes = (strapi.contentTypes[uid] || strapi.components[uid]).attributes;
    const entries = await Promise.all(Object.entries(value).map(async ([key, inner]) => {
      const field = attributes[key];
      if (field?.type === 'media') {
        const importOne = async url => (await upload(url))?.id ?? null;
        inner = field.multiple ? await Promise.all((inner || []).map(importOne)) : await importOne(inner);
      } else if (field?.type === 'component') {
        inner = field.repeatable
          ? await Promise.all((inner || []).map(item => importMedia(field.component, item)))
          : await importMedia(field.component, inner);
      }
      return [key, inner];
    }));
    return Object.fromEntries(entries);
  }

  /** Rewrites `![](/images/x.png)` in article bodies to the uploaded copy. */
  async function inlineImages(body) {
    for (const [, src] of (body || '').matchAll(/!\[[^\]]*\]\((\/[^)]+)\)/g)) {
      const file = await upload(src);
      if (file) body = body.replaceAll(src, file.url);
    }
    return body;
  }

  const site = await importMedia('api::site-setting.site-setting', content.site);
  await strapi.documents('api::site-setting.site-setting').create({ data: site, status: 'published' });

  for (const entry of content.experiences || []) {
    const data = await importMedia('api::experience.experience', entry);
    await strapi.documents('api::experience.experience').create({ data, status: 'published' });
  }

  for (const entry of content.education || []) {
    const data = await importMedia('api::education.education', entry);
    await strapi.documents('api::education.education').create({ data, status: 'published' });
  }

  for (const entry of content.certifications || []) {
    const data = await importMedia('api::certification.certification', entry);
    await strapi.documents('api::certification.certification').create({ data, status: 'published' });
  }

  // Categories and series are real records that articles point at.
  const refs = { category: new Map(), series: new Map() };
  for (const kind of ['category', 'series']) {
    for (const entry of content[kind === 'category' ? 'categories' : 'series'] || []) {
      const data = await importMedia(`api::${kind}.${kind}`, entry);
      const doc = await strapi.documents(`api::${kind}.${kind}`).create({ data });
      refs[kind].set(entry.slug, doc.documentId);
    }
  }

  for (const [group, uid] of [
    ['articles', 'article'],
    ['publications', 'publication'],
    ['projects', 'project'],
  ]) {
    for (const item of content[group] || []) {
      const { draft, ...entry } = item;
      const data = await importMedia(`api::${uid}.${uid}`, entry);
      data.body = await inlineImages(data.body);
      if (uid === 'article') {
        data.category = refs.category.get(data.category) ?? null;
        data.series = refs.series.get(data.series) ?? null;
      }
      if (uid === 'publication') data.category = refs.category.get(data.category) ?? null;
      await strapi.documents(`api::${uid}.${uid}`).create({
        data,
        ...(draft ? {} : { status: 'published' }),
      });
    }
  }

  await store.set({ key: KEY, value: true });
  strapi.log.info('Portfolio settings imported. Restore the private CMS backup to recover authored content.');
  return true;
};
