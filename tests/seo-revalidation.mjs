import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { registerSiteRevalidation } = require('../cms/src/lib/site-revalidate.js');
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
let now = originalNow();
let calls = 0;
let fail = false;
let warning = '';
let middleware;
let lifecycle;
let outer;
const strapi = {
  log: { warn(message) { warning = message; } },
  documents: { use(fn) { middleware = fn; } },
  db: {
    inTransaction: () => Boolean(outer),
    async transaction(fn) { return fn({ trx: outer.trx, onCommit: fn => outer.callbacks.push(fn) }); },
    lifecycles: { subscribe(fn) { lifecycle = fn; } },
  },
};
try {
  Date.now = () => now;
  globalThis.fetch = async () => { calls++; return new Response(null, { status: fail ? 401 : 204 }); };
  registerSiteRevalidation(strapi);
  for (const action of ['create', 'update', 'publish', 'unpublish', 'delete']) {
    const before = calls;
    const result = await middleware({ uid: 'api::article.article', action }, async () => {
      assert.equal(calls, before, 'no refresh before document operation completes');
      return action;
    });
    assert.equal(result, action); assert.equal(calls, before + 1);
  }
  const before = calls;
  await middleware({ uid: 'api::article.article', action: 'findMany' }, async () => []);
  await middleware({ uid: 'api::message.message', action: 'create' }, async () => ({}));
  assert.equal(calls, before, 'reads and private messages do not refresh public content');
  outer = { trx: {}, callbacks: [] };
  await middleware({ uid: 'api::site-setting.site-setting', action: 'update' }, async () => ({}));
  await middleware({ uid: 'api::article.article', action: 'publish' }, async () => ({}));
  assert.equal(calls, before, 'outer transaction remains hidden before commit');
  assert.equal(outer.callbacks.length, 1, 'one notification per transaction');
  const committed = outer; outer = undefined;
  committed.callbacks.forEach(fn => fn());
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(calls, before + 1, 'notification runs on commit');
  outer = { trx: {}, callbacks: [] };
  await middleware({ uid: 'api::article.article', action: 'update' }, async () => ({}));
  outer = undefined; // rollback discards commit callbacks
  assert.equal(calls, before + 1, 'rolled-back changes do not invalidate');
  await lifecycle({ model: { uid: 'plugin::upload.file' }, action: 'afterUpdate' });
  assert.equal(calls, before + 2, 'media changes refresh sharing metadata');
  fail = true;
  await middleware({ uid: 'api::article.article', action: 'publish' }, async () => ({}));
  assert.match(warning, /HTTP 401/, 'HTTP rejection is handled as a failed refresh');
  const failedCalls = calls;
  await middleware({ uid: 'api::article.article', action: 'publish' }, async () => ({}));
  assert.equal(calls, failedCalls, 'failed endpoint has a bounded cooldown');
  now += 30001; fail = false;
  await middleware({ uid: 'api::article.article', action: 'publish' }, async () => ({}));
  assert.equal(calls, failedCalls + 1, 'notification recovers after cooldown');
  console.log('PASS: committed publish/update/unpublish/delete/media refresh, rollback isolation, transaction coalescing and failed-webhook recovery.');
} finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
