module.exports = {
  routes: [
    { method: 'GET', path: '/contributions', handler: 'contributions.index', config: { auth: false } },
  ],
};
