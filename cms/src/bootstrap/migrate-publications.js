/**
 * Publications arrived after the site was set up: this adds them to the navigation bar
 * (after Articles) and fills in their page wording, once. Removing the link or
 * rewording afterwards sticks, since the key below stops this from running again.
 */
const KEY = 'publications-v1';

const LABELS = {
  pageTitle: 'Publications',
  pageDescription: 'Papers and research I have published.',
  listHeading: 'Publications',
  abstractHeading: 'Abstract',
  citeHeading: 'Cite',
};

/** Component data read back carries ids; writing a component replaces it. */
const plain = items => (items || []).map(({ id, ...rest }) => rest);

module.exports = async function migratePublications(strapi) {
  const store = strapi.store({ type: 'core', name: 'portfolio' });
  if (await store.get({ key: KEY })) return;

  const docs = strapi.documents('api::site-setting.site-setting');
  const site = await docs.findFirst({
    status: 'published',
    populate: { navigation: true, publicationLabels: true },
  });
  if (site) {
    const data = {};
    const navigation = plain(site.navigation);
    if (!navigation.some(link => /^\/publications\/?$/.test(link.href))) {
      const after = navigation.findIndex(link => /^\/(articles|blog)\/?$/.test(link.href));
      navigation.splice(after === -1 ? navigation.length : after + 1, 0, {
        label: 'Publications',
        href: '/publications',
      });
      data.navigation = navigation;
    }
    if (!site.publicationLabels) data.publicationLabels = LABELS;
    if (!site.publicationsPerPage) data.publicationsPerPage = 10;
    if (Object.keys(data).length) {
      await docs.update({ documentId: site.documentId, status: 'published', data });
    }
  }
  await store.set({ key: KEY, value: true });
};
