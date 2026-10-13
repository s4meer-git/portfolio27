module.exports = {
  routes: [{ method: 'POST', path: '/visitors', handler: 'visitor.record', config: { auth: false } }],
};
