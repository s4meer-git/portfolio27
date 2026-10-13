const { contributions } = require('../../../lib/contributions');

module.exports = {
  async index(ctx) {
    const site = await strapi.documents('api::site-setting.site-setting').findFirst({
      status: 'published',
      populate: ['contributions'],
    });
    // Cached upstream for an hour; browsers should still ask each time so a CMS
    // change shows up without waiting for a stale copy to expire.
    ctx.set('Cache-Control', 'no-store');
    ctx.body = await contributions(site?.contributions);
  },
};
