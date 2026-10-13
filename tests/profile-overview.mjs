import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const url = process.env.SITE_URL || 'http://127.0.0.1:4321';
const liveFixture = {
  enabled: true, prefix: 'Vibing to', idleText: 'Recently vibing to', status: 'playing',
  trackTitle: 'Billie Jean', artist: 'Michael Jackson', trackUrl: 'https://open.spotify.com/track/test',
  albumCover: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#454545"/><text x="60" y="100" font-size="64" fill="white">♪</text></svg>'),
};
let playback = liveFixture;
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 950 }, timezoneId: 'America/New_York' });
  await context.route('**/api/spotify', route => route.fulfill({ json: playback }));
  const page = await context.newPage();
  await page.clock.install();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'), null, { timeout: 30000 });
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  const panel = page.locator('.profile-overview');
  await panel.scrollIntoViewIfNeeded();
  const columns = await panel.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  assert.equal(columns, 2, 'desktop has two columns');
  assert.match(await page.locator('[data-difference]').innerText(), /ahead|behind|same time/);
  const cover = page.locator('.album-peek');
  const thumb = page.locator('.album-thumb');
  const disc = page.locator('.album-disc');
  assert.equal(await thumb.evaluate(el => el.complete && el.naturalWidth > 0), true);
  const original = await thumb.boundingBox();
  const initialPanel = await panel.boundingBox();
  await page.evaluate(() =>
    document.querySelector('.album-peek-wrap').scrollIntoView({ block: 'center' })
  );
  await page.waitForTimeout(250);
  const icon = await cover.boundingBox();
  const centre = { x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 };
  await page.mouse.move(centre.x, centre.y, { steps: 4 });
  await page.waitForTimeout(450);
  assert.ok((await disc.boundingBox()).width > original.width * 4, 'cover expands');
  assert.equal((await panel.boundingBox()).height, initialPanel.height, 'hover does not shift layout');
  await page.screenshot({ path: '/tmp/profile-desktop-hover.png' });
  await page.mouse.move(0, 0, { steps: 6 });
  await page.waitForTimeout(500);
  assert.ok((await disc.boundingBox()).width < original.width * 2, 'cover returns on hover out');
  await cover.focus();
  await page.waitForTimeout(450);
  assert.ok((await disc.boundingBox()).width > original.width * 4, 'keyboard preview');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  await page.screenshot({ path: '/tmp/profile-desktop.png' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: '/tmp/profile-dark.png' });
  assert.deepEqual(errors, []);
  playback = { ...liveFixture, status: 'recent' };
  await page.clock.fastForward(20001);
  await page.waitForFunction(() => document.querySelector('[data-music-prefix]')?.textContent === 'Recently vibing to');
  assert.equal(await cover.isVisible(), true, 'pause keeps recent artwork');
  assert.equal(await page.locator('[data-track-title]').innerText(), liveFixture.trackTitle);
  assert.equal(await page.locator('.spotify-link').isVisible(), true);
  await page.screenshot({ path: '/tmp/profile-recent.png' });
  playback = { ...liveFixture, trackTitle: 'Next track' };
  await page.clock.fastForward(20001);
  await page.waitForFunction(() => document.querySelector('[data-track-title]')?.textContent === 'Next track');
  playback = { status: 'unavailable' };
  await page.clock.fastForward(20001);
  await page.waitForFunction(() => document.querySelector('spotify-status')?.hidden);
  playback = liveFixture;

  const mobile = await browser.newContext({ viewport: { width: 375, height: 900 }, isMobile: true, hasTouch: true, timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });
  await mobile.route('**/api/spotify', route => route.fulfill({ json: liveFixture }));
  const phone = await mobile.newPage();
  await phone.goto(url, { waitUntil: 'networkidle' });
  await phone.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'), null, { timeout: 30000 });
  await phone.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  await phone.locator('.profile-overview').scrollIntoViewIfNeeded();
  assert.equal(await phone.locator('.profile-overview').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 1);
  const overflow = await phone.locator('.profile-overview').evaluate(el => el.scrollWidth > el.clientWidth);
  assert.equal(overflow, false, 'mobile content fits');
  const mobileCover = phone.locator('.album-peek');
  await mobileCover.tap();
  assert.equal(await mobileCover.getAttribute('aria-expanded'), 'true');
  await phone.locator('.album-disc').tap();
  await phone.waitForTimeout(250);
  assert.equal(await mobileCover.getAttribute('aria-expanded'), 'false');
  assert.equal(
    await phone.locator('.album-stage').evaluate(el => getComputedStyle(el).transitionDuration),
    '0s'
  );
  await phone.screenshot({ path: '/tmp/profile-mobile.png' });
  console.log('PASS: desktop columns, mobile stack, live clock, album hover/focus/touch, reduced motion, no layout shift or page errors.');
} finally { await browser.close(); }
