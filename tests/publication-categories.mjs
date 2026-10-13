import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, webkit } from '@playwright/test';

const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const { credentials } = await import('./helpers/cms-credentials.mjs');
const endpoint = '/content-manager/collection-types/api::publication.publication';
const login = await fetch(cms + '/admin/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials),
});
assert.ok(login.ok);
const token = (await login.json()).data.token;
const api = async (path, method = 'GET', data) => {
  const response = await fetch(cms + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  assert.ok(response.ok, `${method} ${path}: ${response.status}`);
  return response.status === 204 ? undefined : response.json();
};
const refresh = async () => {
  const r = await fetch(site + '/api/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: site }, body: '{}' });
  assert.ok(r.ok);
};
const before = await api('/api/portfolio');
const [first, second] = before.categories;
assert.ok(first && second);
const created = [];
const marker = 'publication-category-check-' + Date.now();
const categoryPath = '/publications/categories/' + first.slug;
const expected = [];
try {
  for (const [i, category] of [first, first, second].entries()) {
    const slug = `${marker}-${i}`;
    const result = await api(endpoint, 'POST', {
      title: `Temporary category verification ${i}`, slug, kind: 'report',
      publishedOn: '2026-10-10', description: 'Temporary verification entry.',
      category: category.documentId,
    });
    const id = (result.data || result).documentId;
    created.push(id);
    assert.equal((await api('/api/portfolio')).publications.length, before.publications.length + i, 'draft stays hidden');
    await api(`${endpoint}/${id}/actions/publish`, 'POST');
    if (category === first) expected.push('/publications/' + slug);
  }
  await refresh();

  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: 'chrome' } : {}) });
    try {
      const page = await browser.newPage({ viewport: engine === chromium ? { width: 1280, height: 900 } : { width: 375, height: 812 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(site + '/publications');
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
      assert.equal(await page.getByRole('heading', { name: 'Series', exact: true }).count(), 0);
      const category = page.locator(`main a[href="${categoryPath}"]`);
      assert.equal(await category.innerText(), '#' + first.name);
      await Promise.all([page.waitForURL(site + categoryPath), category.click()]);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
      assert.equal(await page.locator('main h1').innerText(), first.name);
      assert.equal(await page.locator(`main a[href="${categoryPath}"]`).getAttribute('aria-current'), 'page');
      const paths = await page.locator('main a[href^="/publications/"]:has(h3)').evaluateAll(links => links.map(link => link.getAttribute('href')));
      const existing = before.publications.filter(p => p.category?.slug === first.slug).map(p => '/publications/' + p.slug);
      assert.deepEqual(paths.sort(), [...expected, ...existing].sort());
      for (const dark of [false, true]) {
        await page.evaluate(d => document.documentElement.classList.toggle('dark', d), dark);
        await page.waitForTimeout(200); // Let link colour transitions settle before visual checks.
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no overflow');
        const headers = page.locator('main > section > div').filter({ has: page.locator('h1, h2') });
        for (const header of await headers.all()) assert.equal(await header.evaluate(el => getComputedStyle(el).borderBottomWidth), '1px');
        await page.screenshot({ path: `/tmp/publication-categories-${engine.name()}-${dark ? 'dark' : 'light'}.png` });
      }
      assert.equal((await page.goto(site + '/publications/categories/not-a-category')).status(), 404);
      assert.deepEqual(errors, []);
      console.log(`PASS ${engine.name()}: CMS category selection, complete filtering, active hashtag, borders and mobile layout.`);
    } finally { await browser.close(); }
  }
  for (const file of ['/sitemap.xml', '/llms.txt', '/index.md']) {
    const r = await fetch(site + file);
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes('https://s4meer.com' + categoryPath), 'publication category in ' + file);
  }
  await api(`${endpoint}/${created[0]}/actions/unpublish`, 'POST');
  await api(`${endpoint}/${created[1]}/actions/unpublish`, 'POST');
  await refresh();
  if (!before.publications.some(p => p.category?.slug === first.slug))
    assert.equal((await fetch(site + categoryPath)).status, 404, 'unused category disappears');
  console.log('PASS: draft isolation, publish/unpublish and current SEO discovery.');
} finally {
  for (const id of created) await api(`${endpoint}/${id}`, 'DELETE');
  await refresh();
  const after = await api('/api/portfolio');
  assert.deepEqual(after.publications, before.publications);
  assert.deepEqual(after.articles, before.articles);
  assert.deepEqual(after.series, before.series);
  console.log('PASS: temporary records removed; original content unchanged.');
}
