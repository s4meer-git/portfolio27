const { visitorStore } = require('../../../lib/visitors');
module.exports = {
  async record(ctx) {
    const id = ctx.request.body?.visitId || ctx.request.body?.visitorId;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return ctx.badRequest('Invalid visit ID');
    }
    ctx.set('Cache-Control', 'no-store');
    ctx.body = visitorStore().recordVisit(id);
  },
};
