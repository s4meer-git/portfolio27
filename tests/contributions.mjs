// The activity heatmap and its Overall / GitHub / LeetCode tabs.
//
// Both upstreams are public and unauthenticated, so the first assertions double as
// a canary: if GitHub's contributions API or LeetCode's calendar query changes
// shape, this fails loudly rather than the section quietly emptying.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const CMS = process.env.CMS_URL || 'http://127.0.0.1:1337';
const SITE = process.env.SITE_URL || 'http://127.0.0.1:4321';

const settings = (await (await fetch(`${CMS}/api/portfolio`)).json()).site.contributions;
if (!settings?.enabled) {
  console.log('SKIP: the contributions section is switched off in the CMS.');
  process.exit(0);
}

const data = await (await fetch(`${CMS}/api/contributions`)).json();
assert.ok(data.enabled, 'the endpoint reports the section as enabled');
const sources = data.sources ?? {};
assert.ok(Object.keys(sources).length, 'at least one source resolved');

for (const [name, source] of Object.entries(sources)) {
  assert.ok(source.days.length >= 365, `${name} covers a full year, got ${source.days.length} days`);
  assert.ok(
    source.days.every(d => /^\d{4}-\d{2}-\d{2}$/.test(d.date) && d.level >= 0 && d.level <= 4),
    `${name} days are well formed`
  );
  const summed = source.days.reduce((n, d) => n + d.count, 0);
  assert.equal(summed, source.total, `${name} total matches the sum of its days`);
}
if (sources.overall && sources.github && sources.leetcode) {
  assert.equal(
    sources.overall.total,
    sources.github.total + sources.leetcode.total,
    'the combined view is the sum of the two sources'
  );
}
console.log(
  'api      : ' +
    Object.entries(sources)
      .map(([k, v]) => `${k} ${v.total}`)
      .join(', ')
);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());

  const figure = page.locator('.contributions');
  assert.equal(await figure.count(), 1, 'the heatmap is on the page');

  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector('.contributions');
      const cells = [...el.querySelectorAll('.contrib-grid .contrib-cell')];
      return {
        active: el.dataset.active,
        cells: cells.length,
        levels: cells.map(c => c.dataset.level).join(''),
        selected: [...el.querySelectorAll('.contrib-tab')]
          .filter(t => t.getAttribute('aria-selected') === 'true')
          .map(t => t.textContent.trim()),
        caption: el.querySelector('figcaption').innerText.replace(/\s+/g, ' ').trim(),
      };
    });

  const initial = await read();
  assert.ok(initial.cells >= 365, `a cell per day, got ${initial.cells}`);
  assert.equal(initial.active, settings.defaultView, 'opens on the tab chosen in the CMS');
  console.log(`grid     : ${initial.cells} cells, month labels, default tab "${initial.active}"`);

  // Each tab redraws the grid and rewrites the caption.
  const seen = new Map();
  for (const [key, label] of [
    ['github', settings.githubLabel || 'GitHub'],
    ['leetcode', settings.leetcodeLabel || 'LeetCode'],
    ['overall', settings.overallLabel || 'Overall'],
  ]) {
    if (!sources[key]) continue;
    await page.locator('.contrib-tab', { hasText: new RegExp(`^${label}$`) }).click();
    await page.waitForTimeout(320);
    const state = await read();
    assert.equal(state.active, key, `clicking "${label}" selects ${key}`);
    assert.deepEqual(state.selected, [label], 'exactly one tab reads as selected');
    assert.ok(
      state.caption.includes(sources[key].total.toLocaleString('en')),
      `caption shows the ${key} total`
    );
    assert.ok(!/\s\./.test(state.caption), 'no stray space before the full stop');
    seen.set(key, state.levels);
  }

  // Different sources must actually paint differently.
  const distinct = new Set(seen.values());
  assert.equal(distinct.size, seen.size, 'each tab paints its own grid');
  console.log(`tabs     : ${[...seen.keys()].join(', ')} each redraw the grid and caption`);

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: contributions resolve, render, and switch between sources.');
} finally {
  await browser.close();
}
