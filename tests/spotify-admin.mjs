import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';
const { createConnectionHandlers } = createRequire(import.meta.url)('../cms/src/lib/spotify-connection.js');

let stored = null, now = 0;
const cookie = new Map();
const handlers = createConnectionHandlers({ read: () => stored, save: value => { stored = value; }, now: () => now,
  redirectUri: 'http://127.0.0.1:1337/spotify-connection/callback',
  fetcher: async () => Response.json({ refresh_token: 'new-private-token', scope: 'user-read-currently-playing user-read-recently-played' }),
});
const context = (body = {}, query = {}) => ({ request: { body }, query,
  set() {}, cookies: { set: (key, value) => cookie.set(key, value), get: key => cookie.get(key) },
  badRequest(message) { this.status = 400; this.body = { message }; }, redirect(url) { this.redirected = url; },
});
let ctx = context({ clientId: 'bad' }); handlers.save(ctx); assert.equal(ctx.status, 400);
ctx = context({ clientId: 'a'.repeat(32), refreshToken: 'private-token' }); handlers.save(ctx);
assert.equal(ctx.body.hasRefreshToken, true); assert.ok(!JSON.stringify(ctx.body).includes('private-token'));
ctx = context({ clientId: 'a'.repeat(32), refreshToken: '' }); handlers.save(ctx);
assert.equal(stored.refreshToken, 'private-token', 'blank field preserves saved token');
ctx = context(); handlers.connect(ctx);
const auth = new URL(ctx.body.url);
let callback = context({}, { state: 'wrong', code: 'code' }); await handlers.callback(callback); assert.equal(callback.status, 400);
callback = context({}, { state: auth.searchParams.get('state'), code: 'code' }); await handlers.callback(callback);
assert.match(callback.redirected, /success$/); assert.equal(stored.refreshToken, 'new-private-token');
const replay = context({}, callback.query); await handlers.callback(replay); assert.equal(replay.status, 400);
ctx = context(); handlers.connect(ctx); now += 600001;
callback = context({}, { state: new URL(ctx.body.url).searchParams.get('state'), code: 'code' }); await handlers.callback(callback); assert.equal(callback.status, 400);
ctx = context({ clientId: 'b'.repeat(32) }); handlers.save(ctx); assert.equal(stored.refreshToken, '', 'changing client clears old token');

const cms = 'http://127.0.0.1:1337';
for (const [method, path] of [['GET', ''], ['PUT', ''], ['POST', '/connect'], ['POST', '/disconnect']]) {
  const res = await fetch(cms + '/spotify-connection' + path, { method });
  assert.equal(res.status, 401, 'connection routes require admin login');
}
const credentialPath = 'cms/.spotify-credentials.local';
const existing = fs.existsSync(credentialPath) ? fs.readFileSync(credentialPath) : null;
// Never replace an already connected account just to test a form.
if (existing) throw new Error('Connection exists; unit/auth tests passed. Skip destructive form fixture.');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1050 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(cms + '/admin');
  const { credentials: credentials } = await import('./helpers/cms-credentials.mjs');
  await page.getByRole('textbox', { name: 'Email', exact: false }).fill(credentials.email);
  await page.locator('input[name=password]').fill(credentials.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(url => !url.pathname.includes('/auth/'));
  await page.goto(cms + '/admin/settings/spotify');
  const input = page.locator('input[name="spotify-client-id"]');
  await input.fill('a'.repeat(32));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
  await page.reload();
  await page.waitForFunction(() => document.querySelector('input[name="spotify-client-id"]')?.value === 'a'.repeat(32));
  assert.equal(await page.getByRole('button', { name: 'Connect Spotify', exact: true }).isEnabled(), true);
  assert.match(await page.locator('input[name="spotify-redirect-uri"]').inputValue(), /127\.0\.0\.1:1337\/spotify-connection\/callback$/);
  const publicData = await (await fetch(cms + '/api/portfolio')).text();
  assert.ok(!publicData.includes('a'.repeat(32)) && !publicData.includes('refreshToken'), 'credentials excluded from public content');
  await page.locator('summary').click();
  assert.equal(await page.locator('input[name="spotify-refresh-token"]').getAttribute('type'), 'password');
  await page.screenshot({ path: '/tmp/spotify-admin-settings.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: private Save/reload, masked token, OAuth state/expiry/replay, protected routes and no public credential leakage.');
} finally {
  await browser.close();
  if (fs.existsSync(credentialPath)) {
    const current = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    if (current.clientId === 'a'.repeat(32) && !current.refreshToken) fs.unlinkSync(credentialPath);
  }
}
