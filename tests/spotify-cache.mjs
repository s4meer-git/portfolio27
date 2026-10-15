import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { createSpotifyClient } = createRequire(import.meta.url)('../cms/src/lib/spotify.js');

const credentials = { clientId: 'cache-test', refreshToken: 'test-only-refresh' };
const track = name => ({ type: 'track', name, artists: [{ name: 'Test artist' }], album: { images: [] } });
let clock = 1_000_000, saved = {}, playbackCalls = 0, historyCalls = 0;
let playing = false;
const state = { load: () => structuredClone(saved), save: value => { saved = structuredClone(value); } };
const options = {
  read: () => credentials, save() {}, now: () => clock, state,
  fetcher: async url => {
    if (url.includes('/api/token')) return Response.json({ access_token: 'test-only-access', expires_in: 3600 });
    if (url.includes('recently-played')) {
      historyCalls++;
      return Response.json({ items: [{ track: track('Previous song'), played_at: new Date(clock - 1000).toISOString() }] });
    }
    playbackCalls++;
    return playing ? Response.json({ is_playing: true, item: track('New song') }) : new Response(null, { status: 204 });
  },
};
let client = createSpotifyClient(options);
// Simulate an open homepage for an entire day. Recreating the client every minute
// also verifies that deployments do not discard the shared cache's deadlines.
for (let seconds = 0; seconds < 86400; seconds += 20) {
  if (seconds % 60 === 0) client = createSpotifyClient(options);
  const results = await Promise.all(Array.from({ length: 10 }, () => client()));
  assert.ok(results.every(r => r.trackTitle === 'Previous song'));
  clock += 20_000;
}
assert.equal(historyCalls, 24, 'history is fetched at most once an hour across visitors and restarts');
assert.equal(playbackCalls, 720, 'idle playback uses a shared two-minute cache');
playing = true;
assert.equal((await client()).trackTitle, 'New song', 'expired idle cache detects resumed playback');
const before = playbackCalls;
clock += 20_000;
await client();
assert.equal(playbackCalls, before, 'active playback cache lasts thirty seconds');
clock += 10_000;
await client();
assert.equal(playbackCalls, before + 1);
assert.equal(historyCalls, 24, 'active playback does not query history');

// A history limit is shared with playback, remains in force through restarts,
// and automatically recovers after the exact Retry-After deadline.
clock = 1_000_000; saved = {}; let calls = 0, limited = true;
const limitedOptions = { ...options, fetcher: async url => {
  calls++;
  if (url.includes('/api/token')) return Response.json({ access_token: 'test-only-access', expires_in: 3600 });
  if (url.includes('recently-played')) return Response.json({ error: { reason: 'QUOTA_EXCEEDED' } }, { status: 429, headers: { 'Retry-After': '3600' } });
  return limited ? new Response(null, { status: 204 }) : Response.json({ is_playing: true, item: track('Recovered song') });
} };
client = createSpotifyClient(limitedOptions);
await client();
assert.equal(saved.issue, 'quota_exceeded');
assert.equal(saved.blockedUntil, clock + 3_600_000);
const beforeBlock = calls;
clock += 3_599_000;
client = createSpotifyClient(limitedOptions);
await client();
assert.equal(calls, beforeBlock, 'restart and visitors cannot bypass Spotify cooldown');
clock += 1000; limited = false;
assert.equal((await client()).trackTitle, 'Recovered song');
assert.equal(saved.blockedUntil, 0);
assert.equal(saved.issue, null);

// Preserve the state format deployed before this cache change.
saved = { blockedUntil: clock + 12 * 3600_000, lastTrack: { data: { trackTitle: 'Stored song' }, observedAt: clock } };
client = createSpotifyClient(limitedOptions);
const beforeLegacy = calls;
assert.equal((await client()).trackTitle, 'Stored song');
assert.equal(calls, beforeLegacy, 'existing production cooldown survives the upgrade');
console.log('PASS: shared cache, hourly history, idle/playing TTLs, restart persistence, quota cooldown and automatic recovery.');
