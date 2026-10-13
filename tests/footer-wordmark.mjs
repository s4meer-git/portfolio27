import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light' });
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4321', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  const brand = page.locator('[data-footer-brand]');
  const svg = brand.locator('svg');
  const gradient = brand.locator('linearGradient');
  const normalized = () => gradient.evaluate(el => Number(el.getAttribute('x1')) / el.ownerSVGElement.viewBox.baseVal.width);
  const settle = target => page.waitForFunction(target => {
    const gradient = document.querySelector('[data-footer-brand] linearGradient');
    return Math.abs(Number(gradient.getAttribute('x1')) / gradient.ownerSVGElement.viewBox.baseVal.width - target) < .001;
  }, target);
  assert.equal(await gradient.getAttribute('gradientUnits'), 'userSpaceOnUse');

  for (const width of [375, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await brand.scrollIntoViewIfNeeded();
    const outer = await brand.boundingBox();
    const art = await svg.boundingBox();
    const visible = (outer.y + outer.height - 1 - art.y) / art.height;
    assert.ok(Math.abs(visible - .8) < .015, `${width}px: 80% of glyph height visible (${visible})`);
    assert.ok(art.x - outer.x >= 23, `${width}px: left gutter`);
    assert.ok(outer.x + outer.width - art.x - art.width >= 23, `${width}px: right gutter`);
    assert.ok(outer.width <= width, `${width}px: footer fits viewport (${outer.width})`);
  }

  await page.setViewportSize({ width: 1280, height: 1000 });
  await brand.scrollIntoViewIfNeeded();
  const art = await svg.boundingBox();
  await page.mouse.move(0, 0);
  await settle(.5);
  await brand.screenshot({ path: '/tmp/s4meer-rest.png' });
  await page.mouse.move(art.x + art.width * .1, art.y + art.height * .4);
  const first = await normalized();
  assert.ok(first > .11, 'spring does not jump directly to the cursor');
  await settle(.1);
  await brand.screenshot({ path: '/tmp/s4meer-left.png' });
  await page.mouse.move(art.x + art.width * .9, art.y + art.height * .4);
  assert.ok(await normalized() < .89, 'spring preserves smooth motion when direction changes');
  await settle(.9);
  await brand.screenshot({ path: '/tmp/s4meer-right.png' });
  await page.mouse.move(0, 0);
  assert.ok(await normalized() > .51, 'pointer exit eases back instead of snapping');
  await settle(.5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(art.x + art.width * .1, art.y + art.height * .4);
  assert.equal(await normalized(), .5);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  console.log('Hover, reset, reduced motion and sizing passed; checking navigation.');
  await page.locator('nav a[href="/projects"]').click();
  await page.waitForURL(/\/projects\/?$/);
  // Pages are prefetched on hover, so the URL can change while the page-transition
  // fade is still covering the document; wait for it before pointing at anything.
  await page.waitForFunction(() => !document.getAnimations().some(a => a.effect?.pseudoElement?.startsWith('::view-transition')));
  await brand.scrollIntoViewIfNeeded();
  const nextArt = await svg.boundingBox();
  await page.mouse.move(nextArt.x + nextArt.width * .2, nextArt.y + nextArt.height * .4);
  await settle(.2);
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark') && !document.documentElement.hasAttribute('data-theme-transition'));
  await brand.scrollIntoViewIfNeeded();
  await brand.screenshot({ path: '/tmp/s4meer-dark.png' });
  assert.deepEqual(errors, []);
  console.log('PASS: user-space gradient, spring tracking/reversal/reset, 80% visibility and gutters at four widths, reduced motion, Astro navigation, dark theme.');
} finally { await browser.close(); }
