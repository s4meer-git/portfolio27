import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, webkit } from '@playwright/test';

const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const run = promisify(execFile);

for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
  const browser = await launcher.launch({ headless: true, ...(engine === 'chromium' ? { channel: 'chrome' } : {}) });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/node_modules/'))
        errors.push(`${response.status()} ${response.url()}`);
    });
    await page.addInitScript(() => {
      window.heroScrambles = [];
      new MutationObserver(() => {
        const text = document.querySelector('astro-island[component-export="EncryptedText"] [role="text"]');
        if (text && text.textContent !== window.heroScrambles.at(-1))
          window.heroScrambles.push(text.textContent);
      }).observe(document, { subtree: true, childList: true, characterData: true });
    });

    const check = async () => {
      await page.goto(site);
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
      const encrypted = page.locator('astro-island[component-export="EncryptedText"]');
      await encrypted.waitFor();
      await page.waitForFunction(() => {
        const text = document.querySelector('astro-island[component-export="EncryptedText"] [role="text"]');
        return text && text.textContent === text.getAttribute('aria-label');
      });
      assert.ok(await page.evaluate(() => window.heroScrambles.length >= 3), 'text visibly scrambles before resolving');
      assert.equal(await encrypted.getAttribute('ssr'), null, 'encrypted text hydrated');
      const previews = page.locator('astro-island[component-export="LinkPreview"]');
      assert.ok(await previews.count() >= 5, 'hero contains its profile previews');
      for (const island of await previews.all()) {
        const link = island.locator('a').first();
        await link.scrollIntoViewIfNeeded();
        await page.waitForFunction(el => !el.hasAttribute('ssr'), await island.elementHandle());
        await page.mouse.move(0, 0);
        await page.waitForTimeout(250);
        await link.hover();
        const card = page.locator('.link-preview-card');
        await card.waitFor({ state: 'visible' });
        assert.equal(await card.getAttribute('href'), await link.getAttribute('href'), 'preview keeps the link destination');
        await page.waitForFunction(image => image.complete && image.naturalWidth > 0, await card.locator('img').elementHandle());
        assert.equal(await link.getAttribute('target'), '_blank', 'link still opens a new tab');
      }
      await page.screenshot({ path: `/tmp/hero-effects-${engine}.png` });
      await page.mouse.move(0, 0);
      await page.waitForTimeout(250);
      assert.equal(await page.locator('.link-preview-card').count(), 0, 'preview closes after leaving');
      assert.deepEqual(errors, [], 'no island or dependency errors');
    };

    await check();
    if (engine === 'chromium' && process.env.CHECK_BUILD === 'true') {
      // Reproduce the original failure: build while the same dev server runs,
      // then reload the existing browser and check the effects again.
      await run('npm', ['run', 'build'], { maxBuffer: 4 * 1024 * 1024 });
      await check();
      console.log('PASS: build leaves the running dev server and hero effects working.');
    }

    const phone = await browser.newPage({ viewport: { width: 375, height: 900 }, reducedMotion: 'reduce' });
    await phone.goto(site);
    await phone.waitForFunction(() => {
      const text = document.querySelector('astro-island[component-export="EncryptedText"] [role="text"]');
      return text && text.textContent === text.getAttribute('aria-label');
    });
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile fits');
    console.log(`PASS: ${engine} hero previews, encrypted text progression, closing, destinations and reduced-motion mobile text.`);
  } finally {
    await browser.close();
  }
}
