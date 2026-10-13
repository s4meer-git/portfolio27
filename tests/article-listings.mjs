import assert from 'node:assert/strict';
import { chromium, webkit } from '@playwright/test';

const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const response = await fetch(cms + '/api/portfolio');
assert.ok(response.ok);
const portfolio = await response.json();
const technical = portfolio.articles.filter(article => article.contentKind !== 'personal');
const labels = portfolio.site.articleLabels;
const rows = page => page.locator('main a[href^="/articles/"]:has(h3)');
const paths = page => rows(page).evaluateAll(links => links.map(link => link.getAttribute('href')));
const expectedPath = article => '/articles/' + article.slug;

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel: 'chrome' } : {}) });
  try {
    const context = await browser.newContext({
      viewport: engine === webkit ? { width: 375, height: 812 } : { width: 1280, height: 1000 },
      reducedMotion: 'reduce',
    });
    await context.route('**/api/spotify', route => route.fulfill({ json: { status: 'unavailable' } }));
    await context.route('**/api/visitors', route => route.fulfill({ json: { count: 0 } }));
    await context.addInitScript(() => {
      window.__articlePageLoaded = '';
      document.addEventListener('astro:page-load', () => { window.__articlePageLoaded = location.pathname; });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    async function settled() {
      await page.waitForFunction(() => window.__articlePageLoaded === location.pathname);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
      await page.getByRole('heading', { name: labels.listHeading, level: 2, exact: true }).waitFor();
    }

    async function layout(mode = 'light') {
      await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), mode);
      for (const heading of [labels.categoriesHeading, labels.listHeading]) {
        assert.ok(await page.getByRole('heading', { name: heading, level: 2, exact: true }).isVisible(), 'Navigation section: ' + heading);
      }
      assert.equal(await page.getByRole('heading', { name: labels.seriesHeading, exact: true }).count(), 0, 'Series section removed');
      assert.equal(await page.locator('main a[href^="/articles/series/"]').count(), 0, 'Only category navigation remains');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No viewport overflow');
      const sections = page.locator('main > section');
      for (const section of await sections.all()) {
        assert.equal(await section.locator(':scope > div').first().evaluate(el => getComputedStyle(el).borderBottomWidth), '1px', 'Section heading divider');
        if (engine === chromium) {
          assert.equal(await section.evaluate(el => getComputedStyle(el).borderLeftWidth), '1px');
          assert.equal(await section.evaluate(el => getComputedStyle(el).borderLeftStyle), 'dashed');
        }
      }
      for (const row of await rows(page).all()) {
        assert.equal(await row.locator(':scope > div').evaluate(el => getComputedStyle(el).borderLeftWidth), '1px', 'Article icon divider');
      }
      const main = page.locator('main');
      assert.equal(await main.locator(':scope > div').last().evaluate(el => getComputedStyle(el, '::after').borderBottomWidth), '1px', 'Closing divider');
      if (engine === chromium) {
        for (const pseudo of ['::before', '::after']) {
          const rail = await main.evaluate((el, pseudo) => {
            const s = getComputedStyle(el, pseudo);
            return { width: s.borderLeftWidth, style: s.borderLeftStyle, top: s.top, bottom: s.bottom };
          }, pseudo);
          assert.deepEqual(rail, { width: '1px', style: 'dashed', top: '0px', bottom: '0px' }, 'Continuous page rail');
        }
      }
    }

    await page.goto(site + '/articles');
    await settled();
    await layout();
    const allPaths = [];
    do {
      allPaths.push(...await paths(page));
      const next = page.getByRole('link', { name: 'Next', exact: true });
      if (!(await next.count()) || await next.getAttribute('aria-disabled') === 'true') break;
      const nextPath = await next.getAttribute('href');
      await Promise.all([page.waitForURL(site + nextPath), next.click()]);
      await settled();
    } while (true);
    assert.deepEqual([...new Set(allPaths)].sort(), technical.map(expectedPath).sort(), 'All published articles reachable across pagination');
    assert.equal(allPaths.length, technical.length, 'No pagination duplicates');

    const groups = [
      ...portfolio.series.map(item => ({ kind: 'series', item })),
      ...portfolio.categories.map(item => ({ kind: 'category', item })),
    ].filter(({ kind, item }) => technical.some(article => article[kind]?.slug === item.slug));

    for (const { kind, item } of groups) {
      await page.goto(site + '/articles');
      await settled();
      const path = '/articles/' + (kind === 'series' ? 'series' : 'categories') + '/' + item.slug;
      if (kind === 'series') await page.goto(site + path);
      else await Promise.all([page.waitForURL(site + path), page.locator('main a[href="' + path + '"]').click()]);
      await settled();
      assert.equal(await page.locator('main h1').innerText(), item.name);
      if (kind === 'category') assert.equal(await page.locator('main a[href="' + path + '"]').getAttribute('aria-current'), 'page');
      let expected = technical.filter(article => article[kind]?.slug === item.slug);
      if (kind === 'series' && expected.some(article => article.seriesOrder)) {
        expected.sort((a, b) => (a.seriesOrder || Infinity) - (b.seriesOrder || Infinity));
      }
      assert.deepEqual(await paths(page), expected.map(expectedPath), 'Complete filtered collection: ' + path);
      await layout();
      if (kind === 'series' && item.slug === 'designflix') {
        for (const mode of ['light', 'dark']) {
          await layout(mode);
          await page.screenshot({ path: '/tmp/articles-fixed-designflix-' + engine.name() + '-' + mode + '.png' });
        }
        await rows(page).last().scrollIntoViewIfNeeded();
        await page.screenshot({ path: '/tmp/articles-fixed-designflix-' + engine.name() + '-bottom.png' });
      }
    }
    await page.goto(site + '/journal');
    // Let journal hydration finish before navigating to the intentional 404.
    // WebKit otherwise reports cancelled module imports as page errors.
    await page.waitForFunction(() => window.__articlePageLoaded === location.pathname);
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('main a[href^="/journal/"]:has(h3)').count(), portfolio.articles.filter(article => article.contentKind === 'personal').length);
    assert.equal(await rows(page).count(), 0, 'Personal stories remain separate');
    assert.equal((await page.goto(site + '/articles/series/does-not-exist')).status(), 404);
    assert.deepEqual(errors, []);
    console.log('PASS ' + engine.name() + ': categories only, complete pagination, existing series URLs, category navigation, borders, light/dark, overflow and separate journal.');
  } finally {
    await browser.close();
  }
}
