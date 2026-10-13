import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ colorScheme: 'light' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4321', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.dino-root')?.dinoGame?.spriteImage);

  const milestone = score => page.evaluate(score => {
    const game = document.querySelector('.dino-root').dinoGame;
    if (!game.playing) game.play();
    game.stopLoop();
    game.obstacles = [];
    game.distanceRan = score / 0.025;
    game.update(1000 / 60);
  }, score);

  for (const [score, theme] of [[200, 'dark'], [400, 'light']]) {
    await milestone(score);
    await page.waitForFunction(theme =>
      document.documentElement.hasAttribute('data-theme-transition') &&
      document.documentElement.classList.contains('dark') === (theme === 'dark'), theme);
    assert.match(await page.evaluate(() =>
      getComputedStyle(document.documentElement, '::view-transition-new(root)').animationName
    ), /theme-triangle-reveal/);
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-theme-transition'));
    assert.equal(await page.evaluate(() => localStorage.getItem('theme')), theme);
    assert.equal(await page.locator('.dino-canvas').evaluate(el => getComputedStyle(el).filter),
      theme === 'dark' ? 'invert(1)' : 'none');
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await milestone(600);
  assert.equal(await page.locator('html').evaluate(el => el.classList.contains('dark')), true);
  assert.equal(await page.locator('html').getAttribute('data-theme-transition'), null);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#theme-toggle').click();
  await page.waitForFunction(() => !document.documentElement.classList.contains('dark') &&
    !document.documentElement.hasAttribute('data-theme-transition'));
  assert.deepEqual(errors, []);
  console.log('PASS: game milestones animate both directions, canvas follows theme, persistence, reduced motion, header toggle, no page errors.');
} finally {
  await browser.close();
}
