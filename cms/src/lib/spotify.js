const fs = require('node:fs');
const path = require('node:path');

// Anchored to the Strapi app root. Compiled code runs from `dist/`, so resolving
// this against __dirname landed on `cms/dist/.spotify-credentials.local` -- a build
// artifact directory that `strapi build` empties, which silently disconnected the
// integration. The old location is still read so an existing connection survives.
const storageDir = path.resolve(process.cwd(), process.env.SPOTIFY_STORAGE_DIR || '.');
const credentialPath = path.join(storageDir, '.spotify-credentials.local');
const previousCredentialPath = path.resolve(process.cwd(), '.spotify-credentials.local');
const legacyCredentialPath = path.resolve(__dirname, '../../.spotify-credentials.local');

/** Failures are otherwise silent; log them (once per distinct message) so a broken connection is diagnosable. */
const warned = new Set();
function warn(message) {
  if (warned.has(message)) return;
  warned.add(message);
  if (warned.size > 50) warned.clear();
  (globalThis.strapi?.log?.warn ?? console.warn)(`[spotify] ${message}`);
}

function readCredentials() {
  for (const candidate of [credentialPath, previousCredentialPath, legacyCredentialPath]) {
    try {
      return JSON.parse(fs.readFileSync(candidate, 'utf8'));
    } catch {
      // Try the next location.
    }
  }
  return null;
}
function saveCredentials(value) {
  fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
  const temp = credentialPath + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temp, credentialPath);
}

/**
 * Runtime state kept across CMS restarts, beside the credentials and just as private.
 *
 * Without it every restart (and `strapi develop` restarts on each code change) threw
 * away the access token, the last track and any rate-limit back-off. Each restart then
 * refreshed the token, which rotates Spotify's refresh token, and re-queried the API.
 * Enough restarts tripped Spotify's rate limit (the row went blank), and a restart
 * landing between a rotation and its save lost the connection outright.
 */
const statePath = path.join(storageDir, '.spotify-state.local');
const fileState = {
  load() {
    try {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch {
      return {};
    }
  },
  save(value) {
    try {
      fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 });
      const temp = statePath + '.tmp';
      fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
      fs.renameSync(temp, statePath);
    } catch {
      // Best effort: the client still works from memory.
    }
  },
};
const fingerprint = credentials =>
  require('node:crypto').createHash('sha256').update(`${credentials.clientId}:${credentials.refreshToken}`).digest('hex');
const memoryState = () => {
  let value = {};
  return { load: () => value, save: next => { value = next; } };
};

const PLAYING_CACHE_MS = 30_000;
const IDLE_CACHE_MS = 120_000;
const HISTORY_CACHE_MS = 60 * 60_000;

// Only non-sensitive connection diagnostics are exposed to authenticated admins.
function connectionHealth() {
  const saved = fileState.load();
  return {
    blockedUntil: saved.blockedUntil || 0,
    lastCheckedAt: saved.lastCheckedAt || 0,
    lastSuccessAt: saved.lastSuccessAt || 0,
    issue: saved.issue || null,
  };
}

// One shared poll per CMS process, regardless of the number of visitors.
function createSpotifyClient({
  fetcher = fetch,
  read = readCredentials,
  save = saveCredentials,
  now = Date.now,
  // Injected credentials (tests) get throwaway state; the real ones persist it.
  state = read === readCredentials ? fileState : memoryState(),
} = {}) {
  const restored = state.load();
  let token = restored.token, tokenUntil = restored.tokenUntil || 0, identity = restored.identity;
  let blockedUntil = restored.blockedUntil || 0;
  let cached = { status: 'unavailable' }, cacheUntil = restored.nextCheckAt || 0, pending;
  let historyUntil = restored.historyUntil || 0;
  let lastCheckedAt = restored.lastCheckedAt || 0, lastSuccessAt = restored.lastSuccessAt || 0;
  let issue = restored.issue || null;
  let lastTrack = restored.lastTrack;
  if (lastTrack) cached = { ...lastTrack.data, status: 'recent' };
  const persist = () => state.save({ token, tokenUntil, identity, lastTrack, blockedUntil, nextCheckAt: cacheUntil, historyUntil, lastCheckedAt, lastSuccessAt, issue });
  const validTrack = item => item?.type === 'track' && !item.is_local && !!item.name;
  const trackData = (item, status) => ({
    status, trackTitle: item.name,
    artist: (item.artists || []).map(artist => artist.name).join(', '),
    trackUrl: item.external_urls?.spotify,
    // Smallest artwork that is still sharp at the 128px hover size on a 2x screen
    // (Spotify lists 640, 300 and 64px); the 640px file was four times the bytes.
    albumCover: [...(item.album?.images || [])]
      .sort((a, b) => (a.width || 0) - (b.width || 0))
      .find(image => image.width >= 256)?.url || item.album?.images?.[0]?.url,
  });
  const remembered = () => lastTrack ? { ...lastTrack.data, status: 'recent' } : { status: 'idle' };
  async function rateLimited(response, endpoint) {
    const seconds = Number(response.headers.get('retry-after'));
    const retry = Number.isFinite(seconds) && seconds > 0 ? seconds : 60;
    blockedUntil = Math.max(blockedUntil, now() + retry * 1000);
    const body = await response.json().catch(() => null);
    issue = (body?.error?.reason || body?.reason) === 'QUOTA_EXCEEDED' ? 'quota_exceeded' : 'rate_limited';
    warn(`${endpoint}: ${issue}; next request after ${new Date(blockedUntil).toISOString()}`);
  }
  async function recentTrack() {
    // History changes far less often than playback. Rechecking it on every idle
    // poll exhausted Spotify's quota and froze both endpoints for many hours.
    if (now() < historyUntil) return remembered();
    historyUntil = now() + HISTORY_CACHE_MS;
    try {
      const response = await fetcher('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
      });
      if (response.status === 429) await rateLimited(response, 'recently-played');
      if (!response.ok) {
        warn(`recently-played returned ${response.status}`);
        return remembered();
      }
      const item = (await response.json()).items?.[0];
      const playedAt = Date.parse(item?.played_at);
      if (validTrack(item?.track) && (!lastTrack || playedAt > lastTrack.observedAt)) {
        lastTrack = { data: trackData(item.track, 'recent'), observedAt: Number.isFinite(playedAt) ? playedAt : now() };
      }
      return remembered();
    } catch (error) {
      warn(`recently-played failed: ${error?.name || error}`);
      return remembered();
    }
  }
  async function request() {
    const credentials = read();
    if (!credentials?.clientId || !credentials?.refreshToken) { lastTrack = null; return { status: 'disconnected' }; }
    // A new connection (different client or a token we did not rotate ourselves)
    // starts clean. Hashed, so the state file never holds the refresh token.
    const key = fingerprint(credentials);
    if (key !== identity) { token = null; lastTrack = null; identity = key; historyUntil = 0; }
    if (!token || tokenUntil <= now()) {
      const response = await fetcher('https://accounts.spotify.com/api/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: credentials.refreshToken, client_id: credentials.clientId }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        if (response.status === 429) await rateLimited(response, 'token refresh');
        else issue = response.status === 400 || response.status === 401 ? 'reconnect_required' : 'temporarily_unavailable';
        warn(`token refresh returned ${response.status}`);
        return { status: 'unavailable' };
      }
      const data = await response.json();
      if (!data.access_token) return { status: 'unavailable' };
      const latest = read();
      if (latest?.clientId !== credentials.clientId || latest?.refreshToken !== credentials.refreshToken) return { status: 'disconnected' };
      if (data.refresh_token && data.refresh_token !== credentials.refreshToken) {
        // Spotify rotates the refresh token; save the new one before anything else.
        credentials.refreshToken = data.refresh_token;
        save(credentials);
        identity = fingerprint(credentials);
      }
      token = data.access_token;
      tokenUntil = now() + Math.max(0, (data.expires_in - 60) * 1000);
      persist();
    }
    const response = await fetcher('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401) { token = null; issue = 'temporarily_unavailable'; return { status: 'unavailable' }; }
    if (response.status === 429) {
      await rateLimited(response, 'currently-playing');
      return remembered();
    }
    if (response.ok) { lastSuccessAt = now(); issue = null; }
    if (response.status === 204) return recentTrack();
    if (!response.ok) { issue = response.status === 403 ? 'access_denied' : 'temporarily_unavailable'; return { status: 'unavailable' }; }
    const data = await response.json();
    const item = data.item;
    if (data.device?.is_private_session) return remembered();
    if (!validTrack(item)) return recentTrack();
    // A paused track is still the most recent track; preserve its artwork and link.
    const track = trackData(item, data.is_playing ? 'playing' : 'recent');
    lastTrack = { data: track, observedAt: now() };
    return track;
  }
  return async () => {
    if (pending) return pending;
    // Keep Spotify's Retry-After separate from our ordinary cache TTL. An idle
    // cache must never clear an upstream limit, including after a deployment.
    if (now() < blockedUntil) return remembered();
    if (now() < cacheUntil) return cached;
    pending = (async () => {
      lastCheckedAt = now();
      blockedUntil = 0;
      try { cached = await request(); }
      catch { cached = { status: 'unavailable' }; issue = 'temporarily_unavailable'; }
      cacheUntil = now() + (cached.status === 'playing' ? PLAYING_CACHE_MS : IDLE_CACHE_MS);
      persist();
      return cached;
    })();
    try { return await pending; } finally { pending = null; }
  };
}

/**
 * Resolves a short preview clip for a track.
 *
 * Spotify removed `preview_url` from the Web API (deprecated November 2024); the
 * field is no longer present on track objects at all. Its own embed player still
 * serves a preview MP3, and that file is CORS-open, so the browser can play it
 * directly. That URL is undocumented, so every failure here is soft: the caller
 * simply gets null and the UI falls back to linking out to Spotify.
 */
const PREVIEW_PATTERN = /https:\/\/p\.scdn\.co\/mp3-preview\/[A-Za-z0-9]+/;

function createPreviewResolver({ fetcher = fetch, now = Date.now, ttl = 6 * 60 * 60 * 1000 } = {}) {
  const cache = new Map();

  return async function previewUrl(trackId) {
    if (!/^[A-Za-z0-9]{22}$/.test(trackId || '')) return null;

    const hit = cache.get(trackId);
    if (hit && hit.until > now()) return hit.url;

    let url = null;
    try {
      const response = await fetcher(`https://open.spotify.com/embed/track/${trackId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) url = (await response.text()).match(PREVIEW_PATTERN)?.[0] ?? null;
    } catch {
      // Network trouble or a changed page: treated as "no preview".
    }

    // Cache misses too, briefly, so a track without a preview is not refetched on
    // every hover.
    cache.set(trackId, { url, until: now() + (url ? ttl : 10 * 60 * 1000) });
    return url;
  };
}

const trackPreview = createPreviewResolver();

/** Pulls the track id out of an open.spotify.com track link. */
function trackIdFromUrl(url) {
  return String(url || '').match(/open\.spotify\.com\/track\/([A-Za-z0-9]{22})/)?.[1] ?? null;
}

const currentTrack = createSpotifyClient();
async function spotifyStatus(settings) {
  if (!settings?.enabled) return { enabled: false };
  const common = { enabled: true, prefix: settings.prefix || 'Vibing to', idleText: settings.idleText && settings.idleText !== 'Not listening right now' ? settings.idleText : 'Recently vibing to' };
  if (settings.source === 'manual') return { ...settings, ...common, status: settings.trackTitle ? 'playing' : 'idle' };
  return { ...common, ...await currentTrack() };
}
module.exports = {
  createSpotifyClient,
  createPreviewResolver,
  spotifyStatus,
  trackPreview,
  trackIdFromUrl,
  readCredentials,
  saveCredentials,
  connectionHealth,
};
