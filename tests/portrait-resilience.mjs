import { chromium, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const url = process.env.SITE_URL || 'http://127.0.0.1:4321';
for (const [name, engine, options] of [['Chrome', chromium, {}], ['WebKit', webkit, {}]]) {
  const browser = await engine.launch({ headless: true, ...options });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', colorScheme: 'light' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'));
    await page.evaluate(() => {
      const root = document.querySelector('portrait-switch');
      const parent = root.parentElement;
      root.remove();
      document.documentElement.classList.add('dark');
      parent.append(root);
    });
    await page.waitForFunction(() => document.querySelector('[data-portrait="fortnite"] img').dataset.theme === 'dark');
    assert.equal(await page.locator('[data-portrait="fortnite"] img').evaluate(img => img.complete && img.naturalWidth > 0), true, 'reconnected portrait refreshes its theme');

    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await page.waitForFunction(() => document.querySelector('[data-portrait="fortnite"] img').dataset.theme === 'light');
    let releaseDark;
    const darkGate = new Promise(resolve => { releaseDark = resolve; });
    let darkRequested = false;
    await page.route(url => url.pathname === '/api/portrait' && url.searchParams.get('variant') === 'lego' && url.searchParams.get('theme') === 'dark', async route => {
      darkRequested = true;
      await darkGate;
      await route.continue();
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('.portrait-photo-trigger').click();
    await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-transforming'));
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    for (let attempt = 0; attempt < 60 && !darkRequested; attempt++) await page.waitForTimeout(50);
    assert.equal(darkRequested, true, 'mid-swap theme change requests the new themed source');
    assert.equal(await page.locator('portrait-switch').getAttribute('data-active'), 'fortnite', 'current portrait remains selected while themed image is pending');
    assert.ok(await page.locator('.magic-veil').evaluate(el => Number(getComputedStyle(el).opacity) >= .99), 'fog holds an opaque cover while a source is pending');
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    releaseDark();
    await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-transforming'));
    assert.equal(await page.locator('portrait-switch').getAttribute('data-active'), 'lego');
    assert.equal(await page.locator('[data-portrait="lego"] img').getAttribute('data-theme'), 'light', 'latest theme wins after a delayed source resolves');
    assert.equal(await page.locator('[data-shirt="lego"]').getAttribute('data-position'), 'front');

    await page.locator('.portrait-photo-trigger').click();
    await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-transforming'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-transforming'));
    assert.equal(await page.locator('portrait-switch').getAttribute('data-active'), 'gta6', 'motion preference change does not strand a portrait switch');
    assert.equal(await page.locator('portrait-switch').getAttribute('data-shirt-swapping'), null);
    assert.equal(await page.locator('.shirt-item').evaluateAll(shirts => shirts.flatMap(shirt => shirt.getAnimations()).length), 0);
    assert.deepEqual(errors, []);

    // Verify audio lifecycle without making network/audio playback part of this test.
    if (!await page.evaluate(() => Boolean(customElements.get('pronounce-name')))) {
      // The CMS can disable pronunciation, so exercise its actual component script.
      const source = await readFile(new URL('../src/components/ui/pronounce-name.astro', import.meta.url), 'utf8');
      const script = source.split('<script>')[1].split('</script>')[0];
      await page.addScriptTag({ content: ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText });
    }
    await page.evaluate(() => {
      window.testAudio = [];
      window.Audio = class extends EventTarget {
        constructor(src) { super(); this.src = src; this.plays = 0; this.unloads = 0; window.testAudio.push(this); }
        play() { this.plays++; this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
        pause() { this.dispatchEvent(new Event('pause')); }
        removeAttribute(attribute) { if (attribute === 'src') this.src = ''; }
        load() { this.unloads++; }
      };
      const element = document.createElement('pronounce-name');
      element.dataset.src = '/test-pronunciation.wav';
      element.innerHTML = '<button type="button">Test pronunciation</button>';
      element.id = 'test-pronunciation';
      document.body.append(element);
      element.querySelector('button').click();
      element.remove();
      document.body.append(element);
      element.querySelector('button').click();
    });
    assert.deepEqual(await page.evaluate(() => window.testAudio.map(audio => ({ plays: audio.plays, unloaded: audio.unloads }))), [{ plays: 1, unloaded: 1 }, { plays: 1, unloaded: 0 }], 'pronunciation reconnect works and releases the previous audio');
    await page.evaluate(() => document.querySelector('#test-pronunciation').remove());
    assert.equal(await page.evaluate(() => window.testAudio[1].unloads), 1);
    console.log(`PASS ${name}: theme reconnect, delayed theme race, opaque fog, shirt matching, motion preference changes, and audio reconnect/cleanup.`);
  } finally { await browser.close(); }
}
