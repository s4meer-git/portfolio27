/**
 * The single endpoint the website reads.
 *
 * Deliberately read-only and unauthenticated: it returns published content only, never
 * drafts or accounts. Everything the site renders comes from here in one request.
 */

const docs = uid => strapi.documents(`api::${uid}.${uid}`);
const { spotifyStatus } = require('../../../lib/spotify');

const SITE_POPULATE = {
  profile: { populate: { avatar: true, avatarDark: true, namePronunciation: true, locationPhoto: true,
    avatarShirt: { populate: ['logo'] },
    avatarVariants: { populate: { avatar: true, avatarDark: true, shirt: { populate: ['logo'] } } } } },
  socialLinks: { populate: ['image', 'previewImage'] },
  spotify: { populate: ['albumCover'] },
  navigation: true,
  skills: { populate: ['image'] },
  contributions: true,
  sectionLabels: true,
  articleLabels: true,
  publicationLabels: true,
  projectLabels: true,
  uiLabels: true,
  footer: { populate: { fields: { populate: ['links'] } } },
  cta: { populate: ['methods'] },
  badges: true,
  commandMenu: { populate: ['customLinks'] },
  seo: { populate: { ogImage: true, favicon: true, ownedDomains: true, redirects: true,
    pages: { populate: { metadata: { populate: ['socialImage'] } } } } },
};

module.exports = {
  async index(ctx) {
    const [site, experiences, education, certifications, articles, publications, projects, categories, series] =
      await Promise.all([
      docs('site-setting').findFirst({ status: 'published', populate: SITE_POPULATE }),
      docs('experience').findMany({
        status: 'published',
        sort: ['order:asc'],
        populate: {
          companyLogo: true,
          positions: { populate: ['skills'] },
        },
      }),
      docs('education').findMany({
        status: 'published',
        sort: ['order:asc'],
        populate: ['logo', 'skills'],
      }),
      docs('certification').findMany({
        status: 'published',
        sort: ['order:asc'],
        populate: ['badge', 'issuerLogo'],
      }),
      docs('article').findMany({
        status: 'published',
        sort: ['pubDatetime:desc'],
        populate: { image: true, tags: true, hashtags: true, exercise: true,
          attachments: { populate: ['image'] }, movieMoments: { populate: ['gif', 'video', 'poster'] }, category: true, series: true, seo: { populate: ['socialImage'] } },
      }),
      docs('publication').findMany({
        status: 'published',
        sort: ['publishedOn:desc'],
        populate: { image: true, pdf: true, category: true, tags: true, seo: { populate: ['socialImage'] } },
      }),
      docs('project').findMany({
        status: 'published',
        sort: ['order:asc'],
        populate: { image: true, technologies: true, seo: { populate: ['socialImage'] } },
      }),
      docs('category').findMany({ sort: ['name:asc'], populate: { seo: { populate: ['socialImage'] } } }),
      docs('series').findMany({ sort: ['name:asc'], populate: { seo: { populate: ['socialImage'] } } }),
    ]);

    if (site) site.spotify = await spotifyStatus(site.spotify);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { site, experiences, education, certifications, articles, publications, projects, categories, series };
  },
};
