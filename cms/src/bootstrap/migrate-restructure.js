const fs = require('fs');
const path = require('path');

const KEY = 'restructure-v2';

/** "system-design" -> "System Design", so category pages show a real title. */
const titleCase = slug =>
  String(slug)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const mediaId = value => (value && typeof value === 'object' ? value.id : value) ?? null;

/** Rebuilds the flat 25-field `labels` blob as four grouped components. */
function splitLabels(labels = {}) {
  return {
    sectionLabels: {
      about: labels.about,
      skills: labels.skills,
      experience: labels.experience,
    },
    articleLabels: {
      pageTitle: labels.articlesTitle,
      pageDescription: labels.articlesDescription,
      listHeading: labels.articles,
      categoriesHeading: labels.categories,
      seriesHeading: labels.series,
      categoryPageDescription: labels.categoryDescription,
      seriesPageDescription: labels.seriesDescription,
    },
    projectLabels: {
      pageTitle: labels.projectsTitle,
      pageDescription: labels.projectsDescription,
      coreHeading: labels.coreProjects,
      sideHeading: labels.sideProjects,
      sourceButton: labels.source,
      previewButton: labels.preview,
    },
    uiLabels: {
      showMore: labels.showMore,
      showLess: labels.showLess,
      previous: labels.previous,
      next: labels.next,
      copyCode: labels.copy,
      copiedCode: labels.copied,
      tableOfContents: labels.toc,
      backToTop: labels.backToTop,
      theme: labels.theme,
    },
  };
}

/**
 * Merges the two separate link lists into one. An entry that appeared in both keeps a
 * single record with both flags set, so the same link can never drift between the
 * profile and the footer again.
 */
function mergeLinks(profileLinks = [], footerLinks = []) {
  const byHref = new Map();
  const add = (link, flag) => {
    const key = link.href || link.label;
    const existing = byHref.get(key);
    if (existing) {
      existing[flag] = true;
      // The profile copy carries the "Follow me on"-style prefix; keep whichever has one.
      existing.prefix = existing.prefix || link.prefix || null;
      return;
    }
    byHref.set(key, {
      label: link.label,
      href: link.href,
      prefix: link.prefix || null,
      icon: link.icon || null,
      image: mediaId(link.image),
      showInProfile: false,
      showInFooter: false,
      [flag]: true,
    });
  };
  profileLinks.forEach(link => add(link, 'showInProfile'));
  footerLinks.forEach(link => add(link, 'showInFooter'));
  return [...byHref.values()];
}

function buildSiteSetting(old) {
  const { profile = {}, seo = {}, footer = {} } = old;
  return {
    profile: {
      displayName: profile.displayName,
      role: profile.role,
      slogan: profile.slogan,
      email: profile.email,
      about: profile.about,
      avatar: mediaId(profile.avatar),
      avatarAlt: profile.avatarAlt,
      verified: profile.verified ?? true,
    },
    socialLinks: mergeLinks(profile.links, footer.socialLinks),
    navigation: (old.navigation || []).map(item => ({ label: item.label, href: item.href })),
    skills: (old.skills || []).map(skill => ({
      title: skill.title,
      href: skill.href,
      icon: skill.icon || null,
      image: mediaId(skill.image),
    })),
    ...splitLabels(old.labels),
    footer: {
      author: { prefix: footer.beforeAuthor, label: footer.authorLabel, href: footer.authorUrl },
      source: { prefix: footer.beforeSource, label: footer.sourceLabel, href: footer.sourceUrl },
    },
    seo: {
      title: seo.title,
      author: seo.author,
      profile: seo.profile,
      desc: seo.desc,
      ogImage: mediaId(seo.ogImage),
      favicon: mediaId(seo.favicon),
      language: seo.language,
    },
    articlesPerPage: seo.postPerPage || 6,
  };
}

module.exports = async function migrateRestructure(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return;

  const snapshotPath = path.join(process.cwd(), '.migration/snapshot.json');
  if (!fs.existsSync(snapshotPath)) {
    // Nothing to migrate: a fresh database is seeded straight into the new shape.
    await store.set({ key: KEY, value: true });
    return;
  }

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  strapi.log.info('Migrating portfolio content to the restructured schema...');

  // 1. Website settings: regrouped labels, merged links, reshaped footer.
  await strapi.documents('api::site-setting.site-setting').update({
    documentId: snapshot.siteSetting.documentId,
    data: buildSiteSetting(snapshot.siteSetting),
    status: 'published',
  });

  // 2. Free-text category/series values become real records, reused across articles.
  const cache = { category: new Map(), series: new Map() };
  async function taxonomy(kind, slug) {
    if (!slug) return null;
    if (cache[kind].has(slug)) return cache[kind].get(slug);
    const uid = `api::${kind}.${kind}`;
    const existing = await strapi.documents(uid).findFirst({ filters: { slug } });
    const doc =
      existing ||
      (await strapi.documents(uid).create({ data: { name: titleCase(slug), slug } }));
    cache[kind].set(slug, doc.documentId);
    return doc.documentId;
  }

  for (const article of snapshot.articles) {
    const data = {
      category: await taxonomy('category', article.category),
      series: await taxonomy('series', article.series),
    };
    await strapi.documents('api::article.article').update({
      documentId: article.documentId,
      data,
      ...(article.status === 'published' ? { status: 'published' } : {}),
    });
  }

  await store.set({ key: KEY, value: true });
  strapi.log.info(
    `Migration complete: ${cache.category.size} categories, ${cache.series.size} series.`
  );
};
