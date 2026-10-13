/**
 * Stores a contact-form submission.
 *
 * Validates everything itself (the endpoint is public) and rate-limits by client
 * address and overall, so the table cannot be flooded. The website forwards the
 * visitor's address in `x-forwarded-for`; direct callers are limited by their own.
 */
const { contactMetadata, clientAddress } = require('../../../lib/contact-metadata');
const { contactEmail } = require('../../../lib/contact-email');
const { contactEmailAssets } = require('../../../lib/contact-email-assets');
const EMAIL = /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const WINDOW_MS = 10 * 60 * 1000;
const PER_CLIENT = 5;
const OVERALL = 60;
const recent = new Map();
let overall = [];

function limited(client) {
  const now = Date.now();
  overall = overall.filter(time => now - time < WINDOW_MS);
  const mine = (recent.get(client) || []).filter(time => now - time < WINDOW_MS);
  if (mine.length >= PER_CLIENT || overall.length >= OVERALL) return true;
  mine.push(now);
  overall.push(now);
  recent.set(client, mine);
  if (recent.size > 5000) recent.delete(recent.keys().next().value);
  return false;
}

/**
 * Emails a new message to the site owner, when SMTP is configured (config/plugins.js).
 * Runs after the message is stored and is not awaited by the request: the visitor
 * never waits on the mail server, and a failed send loses nothing, since the message
 * is already under Content Manager → Messages. Replying goes straight to the visitor.
 */
async function notify(entry) {
  if (!process.env.SMTP_HOST) return;
  const site = await strapi
    .documents('api::site-setting.site-setting')
    .findFirst({ status: 'published', populate: {
      profile: { populate: ['avatar'] }, seo: true, navigation: true, footer: true,
      emailBranding: { populate: ['logo', 'logoDark', 'senderAvatar', 'signatureLinks'] },
    } });
  const to = process.env.CONTACT_NOTIFY_TO || site?.profile?.email;
  if (!to) return strapi.log.warn('[contact] No CONTACT_NOTIFY_TO or profile email; notification not sent.');
  const assets = await contactEmailAssets(site, strapi.dirs.static.public);
  await strapi.plugin('email').service('email').send({
    to,
    ...contactEmail(entry, site?.profile, { ...site, assets, recipient: to }),
  });
  strapi.log.info('[contact] Email notification accepted by SMTP.');
}

const clean = value => (typeof value === 'string' ? value.replace(/\u0000/g, '').trim() : '');

module.exports = {
  async submit(ctx) {
    const body = ctx.request.body || {};
    const name = clean(body.name);
    const email = clean(body.email).toLowerCase();
    const message = clean(body.message);

    // Honeypot: a field people never see. Pretend success so bots learn nothing.
    if (clean(body.company)) return (ctx.body = { ok: true });

    const errors = {};
    if (!name || name.length > 100) errors.name = 'Please enter your name.';
    if (!EMAIL.test(email) || email.length > 200) errors.email = 'Please enter a valid email address.';
    if (message.length < 10 || message.length > 5000) errors.message = 'Please write at least a sentence (up to 5,000 characters).';
    if (Object.keys(errors).length) {
      ctx.status = 400;
      return (ctx.body = { ok: false, errors });
    }

    const client = clientAddress(ctx) || 'unknown';
    if (limited(client)) {
      ctx.status = 429;
      return (ctx.body = { ok: false, error: 'Too many messages. Please try again in a few minutes.' });
    }

    const entry = await strapi.documents('api::message.message').create({
      data: { name, email, message, ...contactMetadata(ctx) },
    });
    notify(entry).catch(error =>
      strapi.log.error(`[contact] Could not email the notification: ${error.message}`)
    );
    ctx.body = { ok: true };
  },
};
