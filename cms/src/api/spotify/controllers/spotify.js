const { spotifyStatus, trackPreview, trackIdFromUrl } = require('../../../lib/spotify');
module.exports = {
  async index(ctx) {
    const site = await strapi.documents('api::site-setting.site-setting').findFirst({
      status: 'published', populate: { spotify: { populate: ['albumCover'] } },
    });
    ctx.set('Cache-Control', 'no-store');
    ctx.body = await spotifyStatus(site?.spotify);
  },

  /** `GET /api/spotify/preview?track=<id or open.spotify.com track link>` */
  async preview(ctx) {
    const raw = String(ctx.query.track || '');
    const id = trackIdFromUrl(raw) || (/^[A-Za-z0-9]{22}$/.test(raw) ? raw : null);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { url: id ? await trackPreview(id) : null };
  },
};
