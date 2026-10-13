/**
 * Only one public route: submitting the contact form. Reading, editing and deleting
 * messages happens in the admin panel, never through the public API.
 */
module.exports = {
  routes: [{ method: 'POST', path: '/messages/submit', handler: 'message.submit', config: { auth: false } }],
};
