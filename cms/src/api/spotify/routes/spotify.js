module.exports = {
  routes: [
    { method: 'GET', path: '/spotify', handler: 'spotify.index', config: { auth: false } },
    // Resolved on demand rather than with the status, so scraping the embed page
    // never slows down the poll that every visitor triggers.
    { method: 'GET', path: '/spotify/preview', handler: 'spotify.preview', config: { auth: false } },
  ],
};
