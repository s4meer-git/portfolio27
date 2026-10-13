import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const credentialFile = new URL('../cms/.spotify-credentials.local', import.meta.url);
export async function startSpotifyConnection(clientId, { port = 8888, fetcher = fetch, save = value => {
  const temporary = new URL('../cms/.spotify-credentials.local.tmp', import.meta.url);
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600 });
  fs.renameSync(temporary, credentialFile);
} } = {}) {
  if (!/^[a-f0-9]{32}$/i.test(clientId || '')) throw new Error('Supply your Spotify app Client ID: npm run spotify:connect -- CLIENT_ID');
  const verifier = crypto.randomBytes(64).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = crypto.randomBytes(32).toString('base64url');
  let redirectUri, busy = false, finished = false;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const url = new URL(req.url, redirectUri);
    if (url.pathname !== '/callback') { res.writeHead(404); res.end('Not found'); return; }
    if (url.searchParams.get('state') !== state || finished || busy) { res.writeHead(400); res.end('Invalid or expired connection request.'); return; }
    if (url.searchParams.has('error')) { res.end('Spotify connection cancelled. You can close this tab.'); finish(false); return; }
    const code = url.searchParams.get('code');
    if (!code) { res.writeHead(400); res.end('Missing authorization code.'); return; }
    busy = true;
    try {
      const response = await fetcher('https://accounts.spotify.com/api/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Authorization failed');
      const data = await response.json();
      if (!data.refresh_token || !['user-read-currently-playing', 'user-read-recently-played'].every(scope => data.scope?.split(' ').includes(scope))) throw new Error('Missing playback permission');
      save({ clientId, refreshToken: data.refresh_token });
      res.end('Spotify connected. Your portfolio will update automatically within 40 seconds. You can close this tab.');
      finish(true);
    } catch {
      res.writeHead(502); res.end('Could not connect Spotify. Run the connection command again.'); finish(false);
    }
  });
  let timer;
  function finish(success) {
    finished = true; clearTimeout(timer); server.close(); resolveDone(success);
  }
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  redirectUri = `http://127.0.0.1:${server.address().port}/callback`;
  const query = new URLSearchParams({ client_id: clientId, response_type: 'code', redirect_uri: redirectUri, scope: 'user-read-currently-playing user-read-recently-played', state, code_challenge_method: 'S256', code_challenge: challenge });
  timer = setTimeout(() => finish(false), 10 * 60_000);
  timer.unref();
  return { authorizeUrl: `https://accounts.spotify.com/authorize?${query}`, redirectUri, done, close: () => finish(false) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const connection = await startSpotifyConnection(process.argv[2] || process.env.SPOTIFY_CLIENT_ID);
    console.log(`Open this link to connect your Spotify account:\n${connection.authorizeUrl}`);
    const connected = await connection.done;
    console.log(connected ? 'Spotify connected. Credentials saved privately; no restart needed.' : 'Spotify was not connected. Run this command again to retry.');
    if (!connected) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
