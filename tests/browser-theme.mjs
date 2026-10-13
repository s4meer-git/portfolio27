import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';

const url = process.env.SITE_URL || 'http://127.0.0.1:4321';
for (const [name, engine, options] of [['Chrome', chromium, { channel: 'chrome' }], ['WebKit', webkit, {}]]) {
  const browser = await engine.launch({ headless: true, ...options });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, colorScheme: 'light', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
    assert.match(await page.locator('meta[name="viewport"]').getAttribute('content'), /initial-scale=1, viewport-fit=cover/);
    const background = () => page.evaluate(() => ({
      html: getComputedStyle(document.documentElement).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
      scheme: getComputedStyle(document.documentElement).colorScheme,
      tint: document.querySelector('meta[name="theme-color"]').content,
    }));
    let state = await background();
    assert.equal(state.html, state.body, 'root and page background match');
    assert.equal(state.html, 'rgb(8, 8, 8)', 'saved dark preference colors the page edges');
    assert.equal(state.scheme, 'dark');
    assert.equal(state.tint, '#080808');
    await page.locator('#theme-toggle').tap();
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    state = await background();
    assert.equal(state.html, 'rgb(255, 255, 255)');
    assert.equal(state.html, state.body);
    assert.equal(state.scheme, 'light');
    assert.equal(state.tint, '#ffffff');

    // Headless browsers have zero hardware insets. Exercise actual layout with
    // representative notch/home-indicator dimensions via the shared CSS tokens.
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--safe-area-top', '47px');
      document.documentElement.style.setProperty('--safe-area-bottom', '34px');
    });
    assert.equal(Math.round((await page.locator('.site-navbar').boundingBox()).y), 47);
    await page.evaluate(() => scrollTo(0, 700));
    assert.equal(Math.round((await page.locator('.site-navbar').boundingBox()).y), 47, 'sticky header stays below the notch');
    await page.locator('[data-mobile-menu-toggle]').tap();
    const link = page.locator('#mobile-menu .menu-link').first();
    await link.waitFor({ state: 'visible' });
    assert.ok((await link.boundingBox()).y >= 47, 'menu links avoid the status bar');
    await page.locator('[data-mobile-menu-toggle]').tap();

    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      document.documentElement.style.setProperty('--safe-area-top', '0px');
      document.documentElement.style.setProperty('--safe-area-left', '44px');
      document.documentElement.style.setProperty('--safe-area-right', '44px');
      scrollTo(0, 0);
    });
    const nav = await page.locator('.site-navbar').boundingBox();
    assert.ok(nav.x >= 44 && nav.x + nav.width <= 800, 'landscape navigation avoids the notch at either edge');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'safe areas introduce no horizontal overflow');
    await page.locator('nav a[href="/projects"]').first().click();
    await page.waitForURL('**/projects');
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    state = await background();
    assert.equal(state.html, state.body, 'page navigation preserves matching edge color');
    assert.equal(state.tint, '#ffffff');
    assert.deepEqual(errors, []);
    console.log(`PASS ${name}: theme preference, toggle, root/body tint, notch-safe sticky header/menu, landscape edges, and client navigation.`);
  } finally {
    await browser.close();
  }
}
