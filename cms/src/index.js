const seed = require('./bootstrap/seed');
const migrateRestructure = require('./bootstrap/migrate-restructure');
const migrateFooter = require('./bootstrap/migrate-footer');
const migrateCertificationsCta = require('./bootstrap/migrate-certifications-cta');
const migratePublications = require('./bootstrap/migrate-publications');
const applyAdminView = require('./bootstrap/admin-view');
const migrateSeo = require('./bootstrap/migrate-seo');
const migrateArticleEngagement = require('./bootstrap/migrate-article-engagement');
const { registerSpotifyConnection } = require('./lib/spotify-connection');
const { registerSiteRevalidation } = require('./lib/site-revalidate');
const { syncAdminCredentials } = require('./lib/admin-credentials');

module.exports = {
  register({ strapi }) {
    // Backs the `global::icon-picker` custom field used by the skill and social link
    // components. Stored as a plain string (the icon's name) so the website can look it
    // up in the very same catalog the picker offers.
    strapi.customFields.register({ name: 'icon-picker', type: 'string' });
  },

  async bootstrap({ strapi }) {
    await syncAdminCredentials(strapi);
    registerSpotifyConnection(strapi);
    // A fresh database is seeded straight into the current shape, so the migration is
    // only ever needed for a database created before the restructure.
    const seeded = await seed(strapi);
    if (!seeded) await migrateRestructure(strapi);
    await migrateFooter(strapi);
    await migrateCertificationsCta(strapi);
    await migrateCertificationsCta.migrateFavicon(strapi);
    await migrateCertificationsCta.migrateCommandMenu(strapi);
    await migrateCertificationsCta.migrateContact(strapi);
    await migrateCertificationsCta.migrateIssuerIcons(strapi);
    await migrateCertificationsCta.migrateCredentialIds(strapi);
    await migrateCertificationsCta.migrateNameVoice(strapi);
    await migratePublications(strapi);
    await migrateSeo(strapi);
    await migrateArticleEngagement(strapi);
    await applyAdminView(strapi);
    // Registered last so the migrations above do not each ping the site.
    registerSiteRevalidation(strapi);
  },
};
