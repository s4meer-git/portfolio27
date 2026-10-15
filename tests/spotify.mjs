import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { startSpotifyConnection } from '../scripts/connect-spotify.mjs';
const { createSpotifyClient, spotifyStatus } = createRequire(import.meta.url)('../cms/src/lib/spotify.js');

let instant = 0, calls = 0, mode = 'playing';
let credentials = { clientId: 'test-client', refreshToken: 'private-refresh' };
const client = createSpotifyClient({ now: () => instant, read: () => credentials, save: value => { credentials = value; }, fetcher: async (url, options) => {
  calls++;
  if (url.includes('/api/token')) {
    assert.equal(options.body.get('client_id'), 'test-client');
    return Response.json({ access_token: 'private-access', expires_in: 3600, refresh_token: 'rotated-refresh' });
  }
  if (url.includes('recently-played')) return Response.json({ items: [] });
  if (mode === 'limited') return new Response(null, { status: 429, headers: { 'Retry-After': '90' } });
  if (mode === 'empty') return new Response(null, { status: 204 });
  if (mode === 'revoked') return new Response(null, { status: 401 });
  if (mode === 'offline') throw new Error('Network offline');
  return Response.json({ is_playing: mode !== 'paused', item: {
    name: 'Live song', type: mode === 'episode' ? 'episode' : 'track', artists: [{ name: 'Artist' }],
    external_urls: { spotify: 'https://open.spotify.com/track/test' }, album: { images: [{ width: 640, url: 'https://i.scdn.co/image/test' }] },
  }, device: { name: 'Private device', is_private_session: mode === 'private' } });
} });
const [first, second] = await Promise.all([client(), client()]);
assert.deepEqual(first, second);
assert.equal(calls, 2, 'concurrent requests share token exchange and playback fetch');
assert.equal(first.status, 'playing');
assert.equal(credentials.refreshToken, 'rotated-refresh');
assert.ok(!JSON.stringify(first).includes('private'));
await client(); assert.equal(calls, 2, 'cached across visitors');
for (const value of ['paused', 'empty', 'episode', 'private']) {
  mode = value; instant += 121000;
  assert.equal((await client()).status, 'recent', value);
  assert.equal((await client()).albumCover, first.albumCover, 'keeps the latest cover');
}
mode = 'limited'; instant += 121000;
// Rate limited: keep showing the last known track instead of blanking the row.
assert.equal((await client()).status, 'recent', 'rate limit keeps the last track');
const before = calls;
instant += 80000; await client(); assert.equal(calls, before, 'Retry-After respected');
mode = 'revoked'; instant += 41000; assert.equal((await client()).status, 'unavailable');
mode = 'offline'; instant += 121000; assert.equal((await client()).status, 'unavailable');
assert.deepEqual(await spotifyStatus({ enabled: false }), { enabled: false });
assert.equal((await createSpotifyClient({ read: () => null })()).status, 'disconnected');

// No previously observed playback: recover the last track from Spotify history.
let historyCalls = 0;
const historyClient = createSpotifyClient({ read: () => ({ clientId: 'history-client', refreshToken: 'history-token' }), fetcher: async url => {
  if (url.includes('/api/token')) return Response.json({ access_token: 'history-access', expires_in: 3600 });
  if (url.includes('currently-playing')) return new Response(null, { status: 204 });
  historyCalls++;
  assert.ok(url.endsWith('/recently-played?limit=1'));
  return Response.json({ items: [{ played_at: '2026-09-21T12:00:00Z', track: {
    type: 'track', name: 'Last song', artists: [{ name: 'Last artist' }],
    external_urls: { spotify: 'https://open.spotify.com/track/last' },
    album: { images: [{ width: 300, url: 'https://i.scdn.co/image/last' }] },
  } }] });
} });
const recent = await historyClient();
assert.equal(recent.status, 'recent');
assert.equal(recent.trackTitle, 'Last song');
assert.equal(recent.albumCover, 'https://i.scdn.co/image/last');
assert.equal(historyCalls, 1);
const noHistory = createSpotifyClient({ read: () => ({ clientId: 'new-user', refreshToken: 'new-token' }), fetcher: async url => {
  if (url.includes('/api/token')) return Response.json({ access_token: 'access', expires_in: 3600 });
  if (url.includes('currently-playing')) return new Response(null, { status: 204 });
  return Response.json({ items: [] });
} });
assert.deepEqual(await noHistory(), { status: 'idle' }, 'never invent a track when history is empty');

let saved;
const connection = await startSpotifyConnection('a'.repeat(32), { port: 0, save: value => { saved = value; }, fetcher: async (url, options) => {
  assert.equal(url, 'https://accounts.spotify.com/api/token');
  assert.equal(options.body.get('grant_type'), 'authorization_code');
  const challenge = crypto.createHash('sha256').update(options.body.get('code_verifier')).digest('base64url');
  assert.equal(challenge, new URL(connection.authorizeUrl).searchParams.get('code_challenge'));
  return Response.json({ refresh_token: 'secret-test-token', scope: 'user-read-currently-playing user-read-recently-played' });
} });
try {
  const auth = new URL(connection.authorizeUrl);
  assert.equal(auth.searchParams.get('scope'), 'user-read-currently-playing user-read-recently-played');
  const rejected = await fetch(connection.redirectUri + '?state=wrong&code=ignored');
  assert.equal(rejected.status, 400); assert.equal(saved, undefined);
  const response = await fetch(connection.redirectUri + '?state=' + auth.searchParams.get('state') + '&code=valid');
  assert.equal(response.status, 200);
  assert.equal(await connection.done, true);
  assert.equal(saved.refreshToken, 'secret-test-token');
  assert.ok(!(await response.text()).includes('secret-test-token'));
} finally { connection.close(); }
console.log('PASS: live playback, pause, offline, private sessions, token rotation, shared cache, rate limits, PKCE and OAuth state validation.');
