const { createHash } = require('node:crypto');
const { isIP } = require('node:net');

const bounded = (value, length) => typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, length)
  : '';

function validTimeZone(value) {
  const zone = bounded(value, 100);
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0);
    return zone;
  } catch {
    return null;
  }
}

function clientAddress(ctx) {
  const peer = ctx.req?.socket?.remoteAddress || ctx.request.ip || '';
  // The Astro server forwards its connection address. Only trust that header on
  // the local CMS connection; direct remote callers cannot choose their own IP.
  const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(peer);
  const forwarded = String(ctx.request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = local && isIP(forwarded) ? forwarded : peer;
  return isIP(address) ? address.replace(/^::ffff:(?=\d+\.)/, '') : null;
}

function contactMetadata(ctx) {
  const timeZone = validTimeZone(ctx.request.body?.timeZone);
  const userAgent = bounded(ctx.request.headers['user-agent'], 512) || null;
  const language = bounded(ctx.request.headers['accept-language'], 200) || null;
  // A basic browser signature, not a unique device ID. Do not include the IP,
  // message, email, canvas measurements, or other personal data in the hash.
  const fingerprint = userAgent
    ? createHash('sha256').update(JSON.stringify([userAgent, language, timeZone])).digest('hex')
    : null;
  return { timeZone, userAgent, language, fingerprint, ipAddress: clientAddress(ctx) };
}

module.exports = { contactMetadata, clientAddress, validTimeZone };
