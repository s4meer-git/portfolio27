// ⌘K command menu: opening, ranking, navigation, persistence, theme and clipboard
// commands, and the "G then X" shortcuts. Needs the site on SITE_URL (default :4321).
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('astro-island[component-export="CommandMenu"]:not([ssr])'));

  const search = async query => {
    await page.keyboard.press('Meta+k');
    await page.waitForSelector('[cmdk-input]');
    await page.keyboard.type(query);
    await page.waitForTimeout(150);
    return page.evaluate(() => document.querySelector('[cmdk-item][data-selected="true"]')?.getAttribute('data-value'));
  };

  assert.equal(await search('dark'), 'command::theme-dark', 'commands outrank loose matches');
  assert.equal(await page.inputValue('[cmdk-input]'), 'dark');
  await page.keyboard.press('Escape');
  assert.match(await search('react'), /^Tech Stack::React::/, 'exact title wins');
  await page.keyboard.press('Escape');

  // Spaces must type (the dino game once swallowed them) and Enter navigates.
  assert.match(await search('sql guide'), /^Articles::/);
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/articles\/sql-guide$/);

  // Persisted across navigation; "/" opens it too.
  await page.waitForTimeout(400);
  await page.keyboard.press('/');
  await page.waitForSelector('[cmdk-input]');
  await page.keyboard.press('Escape');

  await search('dark');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.classList.contains('dark') && !document.documentElement.hasAttribute('data-theme-transition'));
  assert.equal(await page.getAttribute('meta[name=theme-color]', 'content'), '#080808');

  await search('copy mark');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).startsWith('<svg'), 'mark copied');

  await page.keyboard.press('g');
  await page.keyboard.press('h');
  await page.waitForURL(new RegExp(`^${base}/?$`));

  // Phones: no ⌘K in the navigation bar; the menu button opens the links instead.
  await page.setViewportSize({ width: 390, height: 800 });
  assert.equal(await page.isVisible('[data-command-menu-trigger]'), false, 'no ⌘K on phones');
  await page.click('[data-mobile-menu-toggle]');
  await page.waitForSelector('#mobile-menu[data-open="true"] .menu-link');
  await page.waitForTimeout(900);
  await page.click('#mobile-menu .menu-link[href="/articles"]');
  await page.waitForURL(`${base}/articles`);
  assert.equal(await page.getAttribute('#mobile-menu', 'data-open'), 'false', 'a link closes the menu');

  assert.deepEqual(errors, []);
  console.log('PASS: opens by ⌘K, "/" and button; ranks commands and titles first; navigates, persists, switches theme, copies SVG, G-shortcuts; phones get the menu button instead.');
} finally {
  await browser.close();
}
