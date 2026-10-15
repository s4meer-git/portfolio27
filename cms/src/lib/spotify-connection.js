const crypto = require('node:crypto');
const { readCredentials, saveCredentials, connectionHealth } = require('./spotify');

function createConnectionHandlers({ read = readCredentials, save = saveCredentials, fetcher = fetch, redirectUri, now = Date.now }) {
  const pending = new Map();
  let generation = 0;
  const cookieName = 'portfolio.spotify.state';
  const cookieOptions = { signed: true, httpOnly: true, sameSite: 'lax', secure: redirectUri.startsWith('https:'), path: '/spotify-connection/callback', maxAge: 600000 };
  const summary = () => {
    const credentials = read();
    return { clientId: credentials?.clientId || '', hasRefreshToken: !!credentials?.refreshToken, redirectUri };
  };
  return {
    status(ctx) { ctx.set('Cache-Control', 'no-store'); ctx.body = { ...summary(), health: connectionHealth() }; },
    save(ctx) {
      const clientId = typeof ctx.request.body?.clientId === 'string' ? ctx.request.body.clientId.trim() : '';
      const refreshToken = typeof ctx.request.body?.refreshToken === 'string' ? ctx.request.body.refreshToken.trim() : '';
      if (!/^[a-f0-9]{32}$/i.test(clientId || '')) return ctx.badRequest('Enter the 32-character Client ID from your Spotify app.');
      if (refreshToken && (refreshToken.length > 4096 || /\s/.test(refreshToken))) return ctx.badRequest('Enter a valid refresh token without spaces.');
      const previous = read();
      // Blank input preserves the token only for the same client. Never return it to the browser.
      save({ clientId, refreshToken: refreshToken || (previous?.clientId === clientId ? previous.refreshToken : '') || '' });
      pending.clear();
      generation++;
      ctx.set('Cache-Control', 'no-store'); ctx.body = summary();
    },
    connect(ctx) {
      const credentials = read();
      if (!/^[a-f0-9]{32}$/i.test(credentials?.clientId || '')) return ctx.badRequest('Save your Client ID first.');
      for (const [key, value] of pending) if (value.expires <= now()) pending.delete(key);
      if (pending.size >= 20) pending.clear();
      const state = crypto.randomBytes(32).toString('base64url');
      const verifier = crypto.randomBytes(64).toString('base64url');
      pending.set(state, { verifier, clientId: credentials.clientId, generation, expires: now() + 600000 });
      ctx.cookies.set(cookieName, state, cookieOptions);
      const query = new URLSearchParams({ client_id: credentials.clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'user-read-currently-playing user-read-recently-played', state, code_challenge_method: 'S256', code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url') });
      ctx.set('Cache-Control', 'no-store');
      ctx.body = { url: `https://accounts.spotify.com/authorize?${query}` };
    },
    disconnect(ctx) {
      const credentials = read();
      if (credentials) save({ clientId: credentials.clientId, refreshToken: '' });
      pending.clear(); generation++; ctx.set('Cache-Control', 'no-store'); ctx.body = summary();
    },
    async callback(ctx) {
      ctx.set('Cache-Control', 'no-store'); ctx.set('Referrer-Policy', 'no-referrer');
      const state = ctx.query.state;
      const request = typeof state === 'string' ? pending.get(state) : null;
      if (!request || request.expires <= now() || ctx.cookies.get(cookieName, { signed: true }) !== state) return ctx.badRequest('Connection expired. Return to Strapi settings and connect again.');
      pending.delete(state); ctx.cookies.set(cookieName, null, cookieOptions);
      const finish = result => ctx.redirect(`/admin/settings/spotify?connection=${result}`);
      if (ctx.query.error) return finish('cancelled');
      if (typeof ctx.query.code !== 'string' || read()?.clientId !== request.clientId) return finish('failed');
      try {
        const response = await fetcher('https://accounts.spotify.com/api/token', {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'authorization_code', code: ctx.query.code, redirect_uri: redirectUri, client_id: request.clientId, code_verifier: request.verifier }),
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) return finish('failed');
        const data = await response.json();
        if (!data.refresh_token || !['user-read-currently-playing', 'user-read-recently-played'].every(scope => data.scope?.split(' ').includes(scope))) return finish('failed');
        if (generation !== request.generation || read()?.clientId !== request.clientId) return finish('failed');
        save({ clientId: request.clientId, refreshToken: data.refresh_token });
        return finish('success');
      } catch { return finish('failed'); }
    },
  };
}

function registerSpotifyConnection(strapi) {
  const serverUrl = strapi.config.get('server.url') || `http://127.0.0.1:${strapi.config.get('server.port', 1337)}`;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || new URL('/spotify-connection/callback', serverUrl.replace('://localhost', '://127.0.0.1')).href;
  const handlers = createConnectionHandlers({ redirectUri });
  const protect = handler => async ctx => {
    if (!ctx.state.user?.roles?.some(role => role.code === 'strapi-super-admin')) return ctx.forbidden('Only a Super Admin can manage the Spotify connection.');
    return handler(ctx);
  };
  strapi.server.routes({ type: 'admin', routes: [
    ...[['GET', '', 'status'], ['PUT', '', 'save'], ['POST', '/connect', 'connect'], ['POST', '/disconnect', 'disconnect']].map(([method, suffix, name]) => ({ method, path: `/spotify-connection${suffix}`, handler: protect(handlers[name]), config: { policies: ['admin::isAuthenticatedAdmin'] } })),
    { method: 'GET', path: '/spotify-connection/callback', handler: handlers.callback, config: { auth: false } },
  ] });
}
module.exports = { createConnectionHandlers, registerSpotifyConnection };
