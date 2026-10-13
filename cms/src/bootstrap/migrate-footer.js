const KEY = 'footer-cad-v1';
const link = (label, href) => ({ label, ...(href ? { href } : {}), newTab: true });
const cell = (label, kind, links = [], width = 'one') => ({ label, kind, width, links });

module.exports = async function migrateFooter(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return;
  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({ status: 'published', populate: { profile: true, footer: { populate: { fields: { populate: ['links'] } } } } });
  if (!site) return;
  if (site.footer?.fields?.length) {
    await store.set({ key: KEY, value: true });
    return;
  }
  // Published and draft component IDs differ; create fresh nested components.
  const previous = JSON.parse(JSON.stringify(site.footer || {}, (key, value) => key === 'id' ? undefined : value));
  const fields = [
    cell('Crafted by', 'links', [link(site.profile.displayName, site.profile.email ? `mailto:${site.profile.email}` : undefined)]),
    cell('Build', 'build'),
    cell('Date', 'date'),
    cell('Content', 'content-count'),
    cell('Deployed on', 'links', [link('Local development')]),
    cell('Source code', 'source', [link('GitHub')]),
    cell('Credits', 'links', [link('Asset credits', 'https://github.com/s4meer-git/portfolio27/blob/main/docs/third-party/sources.md')]),
    cell('Typeface', 'links', [link('Geist', 'https://vercel.com/font')]),
    cell('Stack', 'stack', [], 'two'),
    cell('Analytics', 'links', [link('Vercel Analytics', 'https://vercel.com/analytics')]),
    cell('For agents', 'links', [link('llms.txt', '/llms.txt'), link('index.md', '/index.md')]),
    cell('Inspired by', 'inspiration', [
      link('Chánh Đại', 'https://chanhdai.com'), link('Tailwind CSS', 'https://tailwindcss.com'),
      link('shadcn/ui', 'https://ui.shadcn.com'), link('Vercel', 'https://vercel.com'),
      link('Evil Charts', 'https://evilcharts.com'), link('Devouring Details', 'https://devouringdetails.com'),
      link('Skiper UI', 'https://skiper-ui.com'), link('Making Software', 'https://www.makingsoftware.com'),
    ], 'full'),
  ];
  await docs.update({ documentId: site.documentId, status: 'published', data: { footer: {
    ...previous, title: 'S4MEER.COM',
    homeHref: '/', repositoryUrl: 'https://github.com/s4meer-git/portfolio27', repositoryBranch: 'main',
    developerBuildLabel: 'Developer build', unavailableBuildLabel: 'Unavailable', showWordmark: true, fields,
  } } });
  await store.set({ key: KEY, value: true });
  strapi.log.info('Added editable footer grid and GitHub build settings.');
};
