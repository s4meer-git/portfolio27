import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const url = process.env.SITE_URL || 'http://127.0.0.1:4323';
const ready = page => page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'), null, { timeout: 30000 });
const deferred = () => {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  return { promise, release };
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const portrait = deferred();
  const hydration = deferred();
  const spotify = deferred();
  await page.route('**/api/portrait?*', async route => { await portrait.promise; await route.continue(); });
  await page.route('**/*encrypted-text*', async route => { await hydration.promise; await route.continue(); });
  await page.route('**/api/spotify', async route => {
    await spotify.promise;
    await route.fulfill({ json: { enabled: false, status: 'unavailable' } });
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => customElements.get('site-loader'));
  assert.equal(await page.locator('site-loader').isVisible(), true, 'overlay covers incomplete page');
  assert.equal(await page.locator('[data-page-content]').evaluate(el => el.inert), true, 'content cannot receive focus while covered');
  assert.equal(await page.locator('site-loader svg').getAttribute('fill'), 'none', 'SC is hollow');
  const beam = page.locator('site-loader .loader-beam').last();
  assert.equal(Math.round((await page.locator('.loader-mark').boundingBox()).width), 189, 'desktop logo is 30% smaller');
  assert.ok(await beam.evaluate(el => el.getAnimations()[0].effect.getKeyframes().filter(frame => frame.easing.includes('cubic-bezier')).length > 20), 'outline eases into/out of turns');
  const offset = await beam.evaluate(el => getComputedStyle(el).strokeDashoffset);
  await page.waitForTimeout(150);
  assert.notEqual(await beam.evaluate(el => getComputedStyle(el).strokeDashoffset), offset, 'light travels along the outline');
  await page.screenshot({ path: '/tmp/page-loader-dark.png' });
  portrait.release();
  spotify.release();
  await page.waitForFunction(() => document.querySelector('[data-portrait="fortnite"] img').complete);
  await page.waitForTimeout(350);
  assert.equal(await page.locator('site-loader').isVisible(), true, 'overlay waits for component hydration after image is ready');
  hydration.release();
  await page.waitForFunction(() => document.querySelector('site-loader').hasAttribute('data-leaving'));
  assert.ok(await beam.evaluate(el => el.getAnimations()[0].effect.getComputedTiming().currentIteration >= 1), 'one complete trace plays before dismissal');
  await ready(page);
  assert.equal(await page.locator('[data-page-content]').evaluate(el => el.inert), false);
  assert.equal(await page.locator('site-loader').evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'hidden loader performs no animation work');
  assert.equal(await page.locator('[data-portrait="fortnite"] img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await page.getByRole('button', { name: 'Switch to LEGO portrait', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('portrait-switch').dataset.active === 'lego');
  await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-transforming'));
  const slogan = page.locator('astro-island[component-url*="encrypted-text"] [role="text"]');
  const text = await slogan.getAttribute('aria-label');
  await page.waitForFunction(expected => {
    const el = document.querySelector('astro-island[component-url*="encrypted-text"] [role="text"]');
    return el?.textContent === expected;
  }, text);
  await page.locator('nav a[href="/projects"]').first().click();
  await page.waitForURL('**/projects');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('site-loader').isVisible(), false, 'initial loader does not reappear on client navigation');
  assert.deepEqual(errors, []);

  const slowPage = await browser.newPage({ colorScheme: 'light' });
  const slowImage = deferred();
  await slowPage.route('**/api/portrait?*', async route => { await slowImage.promise; await route.continue(); });
  await slowPage.goto(url, { waitUntil: 'domcontentloaded' });
  await slowPage.waitForFunction(() => {
    const beam = document.querySelector('site-loader .loader-beam');
    return beam?.getAnimations()[0]?.effect.getComputedTiming().currentIteration >= 1;
  });
  assert.equal(await slowPage.locator('site-loader').isVisible(), true, 'loader continues after a full trace while page is incomplete');
  assert.equal(await slowPage.locator('site-loader').getAttribute('data-leaving'), null);
  await slowPage.screenshot({ path: '/tmp/page-loader-desktop-light.png' });
  slowImage.release();
  await ready(slowPage);

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce', colorScheme: 'light' });
  const mobileImage = deferred();
  await mobile.route('**/api/portrait?*', async route => { await mobileImage.promise; await route.abort(); });
  await mobile.goto(url, { waitUntil: 'domcontentloaded' });
  await mobile.waitForFunction(() => customElements.get('site-loader'));
  assert.equal(await mobile.locator('site-loader').isVisible(), true);
  assert.equal(Math.round((await mobile.locator('.loader-mark').boundingBox()).width), 126, 'mobile logo is 30% smaller');
  assert.equal(await mobile.locator('site-loader').evaluate(el => el.getAnimations({ subtree: true }).length), 0, 'reduced motion keeps a static hollow wordmark');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await mobile.screenshot({ path: '/tmp/page-loader-mobile-light.png' });
  mobileImage.release();
  await ready(mobile);
  assert.equal(await mobile.locator('site-loader').isVisible(), false, 'failed image settles without trapping the page');

  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(url, { waitUntil: 'load' });
  assert.equal(await noJS.locator('site-loader').isVisible(), false, 'no-JS visitors can access the page');

  const failedModule = await browser.newPage();
  await failedModule.route('**/*encrypted-text*', route => route.abort());
  await failedModule.goto(url, { waitUntil: 'load' });
  await ready(failedModule);
  assert.equal(await failedModule.locator('site-loader').isVisible(), false, 'failed module does not trap server-rendered content');

  const failedBootstrap = await browser.newPage({ reducedMotion: 'reduce' });
  await failedBootstrap.route('**/_astro/*.js', route => route.abort());
  await failedBootstrap.goto(url, { waitUntil: 'load' });
  await ready(failedBootstrap);
  assert.equal(await failedBootstrap.locator('site-loader').isVisible(), false, 'failed component scripts do not trap the loader on a pending readiness marker');
  assert.equal(await failedBootstrap.locator('[data-page-content]').evaluate(el => el.inert), false);

  const missingLoader = await browser.newPage({ reducedMotion: 'reduce' });
  await missingLoader.addInitScript(() => {
    const define = customElements.define.bind(customElements);
    customElements.define = (name, constructor, options) => {
      if (name !== 'site-loader') define(name, constructor, options);
    };
  });
  await missingLoader.goto(url, { waitUntil: 'load' });
  await ready(missingLoader);
  assert.equal(await missingLoader.locator('site-loader').isVisible(), false, 'missing loader registration falls back to accessible server-rendered content');

  const removed = await browser.newPage();
  const removedImage = deferred();
  await removed.route('**/api/portrait?*', async route => { await removedImage.promise; await route.continue(); });
  await removed.goto(url, { waitUntil: 'domcontentloaded' });
  await removed.waitForFunction(() => document.querySelector('[data-page-content]').inert);
  await removed.locator('site-loader').evaluate(loader => loader.remove());
  assert.equal(await removed.evaluate(() => document.documentElement.hasAttribute('data-page-loading')), false, 'disconnect releases the loader scroll lock');
  assert.equal(await removed.locator('[data-page-content]').evaluate(el => el.inert), false, 'disconnect releases inert content');
  removedImage.release();
  await removed.waitForLoadState('load');
  console.log('PASS: loader waits for image/component readiness, hollow SC trace moves, page unlocks, portrait effect works, navigation stays usable, reduced motion, mobile, failed image, and no-JS fallback.');
} finally {
  await browser.close();
}
