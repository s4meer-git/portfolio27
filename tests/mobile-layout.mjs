import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.route('**/api/visitors', route => route.fulfill({ json: { ordinal: 2789 } }));
  page.setDefaultTimeout(12000);
  const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
  for (const width of [320, 390, 767, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    const scroller = page.locator('.contrib-scroll');
    await scroller.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => customElements.get('contribution-scroll'));
    const state = await scroller.evaluate(el => ({
      root: parseFloat(getComputedStyle(document.documentElement).fontSize),
      end: el.scrollWidth - el.clientWidth,
      position: el.scrollLeft,
      cell: el.querySelector('rect').getBoundingClientRect().width,
      radius: el.querySelector('rect').getAttribute('rx'),
      scrollbar: getComputedStyle(el).scrollbarWidth,
      days: el.querySelectorAll('rect').length,
    }));
    assert.ok(Math.abs(state.root - (width < 768 ? 15.84 : 17.6)) < 0.01);
    assert.ok(Math.abs(state.position - state.end) <= 1, 'opens at latest dates');
    assert.equal(state.scrollbar, 'none');
    assert.equal(state.radius, '0');
    assert.ok(state.days >= 365);
    if (width < 768) { assert.ok(state.end > 0); assert.ok(Math.abs(state.cell - 12) < 0.1); }
    if (state.end > 200) {
      await page.waitForFunction(() => /^(0px|calc\(0% \+ \(0 \*)/.test(getComputedStyle(document.querySelector('.contrib-scroll')).getPropertyValue('--contrib-fade-end')));
      await scroller.evaluate(el => el.scrollLeft = 0);
      await page.waitForFunction(() => /^(0px|calc\(0% \+ \(0 \*)/.test(getComputedStyle(document.querySelector('.contrib-scroll')).getPropertyValue('--contrib-fade-start')));
      await scroller.evaluate(el => el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2);
      await page.waitForFunction(() => {
        const s = getComputedStyle(document.querySelector('.contrib-scroll'));
        // Scroll-timeline interpolation may serialize as a calc() expression.
        return s.getPropertyValue('--contrib-fade-start') === 'calc(0% + min(12%, 40px))' && s.getPropertyValue('--contrib-fade-end') === 'calc(0% + min(12%, 40px))';
      });
      const previous = await scroller.evaluate(el => el.scrollLeft);
      for (const tab of await page.locator('.contrib-tab').all()) {
        await tab.click();
        assert.equal(await tab.getAttribute('aria-selected'), 'true');
        assert.ok(Math.abs(await scroller.evaluate(el => el.scrollLeft) - previous) < 1);
      }
      await scroller.evaluate(el => el.scrollLeft = el.scrollWidth);
    }
    assert.equal(await page.locator('.skills-list').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    if (width === 390) {
      await page.locator('.contributions').screenshot({ path: '/tmp/mobile-contributions-scroll.png' });
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await page.locator('.contributions').screenshot({ path: '/tmp/mobile-contributions-scroll-dark.png' });
    }
    console.log(width, state);
  }
  console.log('PASS: mobile font scale, readable scrollable cells, rightmost start, edge fades, tabs, skill layout.');
} finally { await browser.close(); }
