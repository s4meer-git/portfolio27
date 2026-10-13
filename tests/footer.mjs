import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, colorScheme: 'light' });
  await page.route("**/api/visitors", route => route.fulfill({ json: { ordinal: 31805 } }));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal((await page.locator('[data-footer-build]').textContent()).trim(), 'Developer build');
  assert.equal(await page.locator('.footer-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 4);
  assert.ok(await page.locator('.footer-grid a[href="https://github.com/s4meer-git/Portfolio"]').count());
  for (const path of ['/llms.txt', '/index.md']) {
    const response = await page.request.get(base + path);
    assert.equal(response.status(), 200);
    assert.match(await response.text(), /^# /);
  }
  const frame = await page.locator('.footer-frame').boundingBox();
  const main = await page.locator('main').boundingBox();
  assert.equal(frame.width, main.width);
  assert.equal(frame.x, main.x);
  assert.equal(await page.locator('.footer-stripes, .footer-spacer, .footer-social').count(), 0);
  assert.equal(await page.locator('.footer-title').textContent(), 'S4MEER.COM');
  await page.waitForFunction(() => document.querySelector('visitor-count').textContent === '31,805 total visits');
  const brand = page.locator('[data-footer-brand]');
  await brand.scrollIntoViewIfNeeded();
  await brand.hover({ position: { x: 80, y: 80 } });
  const gradient = brand.locator('linearGradient');
  const center = await brand.locator('svg').evaluate(el => el.viewBox.baseVal.width / 2);
  await page.waitForFunction(center => Math.abs(Number(document.querySelector('[data-footer-brand] linearGradient').getAttribute('x1')) - center) > 1, center);
  await page.mouse.move(0, 0);
  await page.waitForFunction(center => Math.abs(Number(document.querySelector('[data-footer-brand] linearGradient').getAttribute('x1')) - center) < 1, center);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await brand.hover({ position: { x: 80, y: 80 } });
  assert.equal(Number(await gradient.getAttribute('x1')), center);
  await page.locator('#theme-toggle').click();
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await page.locator('.footer-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('PASS: local build, repository link, agent documents, interactive/reduced-motion S4MEER wordmark, dark mode, desktop/mobile grid.');
} finally {
  await browser.close();
}
