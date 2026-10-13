// Checks the Experience and Education sections: the data the CMS exposes, how they
// render, and that the collapsible rows open, close and animate their chevron.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const CMS = process.env.CMS_URL || 'http://127.0.0.1:1337';
const SITE = process.env.SITE_URL || 'http://127.0.0.1:4321';

// --- what the API hands the site -------------------------------------------
const content = await (await fetch(`${CMS}/api/portfolio`)).json();
assert.ok(content.experiences?.length, 'experiences are exposed');
assert.ok(content.education?.length, 'education is exposed');

for (const experience of content.experiences) {
  assert.ok(experience.company, 'every experience has a company');
  for (const position of experience.positions || []) {
    assert.ok(position.title, `${experience.company}: position has a title`);
    assert.match(
      position.startDate || '',
      /^(\d{2}\.)?\d{4}$/,
      `${position.title}: start is MM.YYYY or YYYY, got "${position.startDate}"`
    );
    if (position.endDate) {
      assert.match(position.endDate, /^(\d{2}\.)?\d{4}$/, `${position.title}: end format`);
    }
  }
}
console.log(
  `api     : ${content.experiences.length} companies, ` +
    `${content.experiences.reduce((n, e) => n + (e.positions?.length || 0), 0)} roles, ` +
    `${content.education.length} education entries`
);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  // The dev toolbar floats over the page centre and swallows clicks.
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());

  // --- every company and school reaches the page ---
  const body = await page.locator('body').innerText();
  for (const experience of content.experiences) {
    assert.ok(body.includes(experience.company), `"${experience.company}" is rendered`);
  }
  for (const item of content.education) {
    assert.ok(body.includes(item.school), `"${item.school}" is rendered`);
  }
  console.log('render  : all companies and schools present');

  // --- durations are computed, not stored ---
  const durations = await page.evaluate(() =>
    [...document.querySelectorAll('dd.tabular-nums')]
      .map(d => d.textContent.trim())
      .filter(t => /^\d+y( \d+m)?$|^\d+m$/.test(t))
  );
  assert.ok(durations.length > 0, 'durations are shown');
  console.log('duration: ' + durations.slice(0, 6).join(', '));

  // --- ongoing roles show the infinity sign rather than an end date ---
  const ongoing = content.experiences.flatMap(e =>
    (e.positions || []).filter(p => !p.endDate)
  ).length;
  const infinities = await page.locator('svg[aria-label="Present"]').count();
  assert.equal(infinities, ongoing, `one infinity sign per ongoing role (${ongoing})`);
  console.log(`ongoing : ${infinities} role(s) show the infinity sign`);

  // --- a row opens, animates and closes ---
  const row = await page.evaluateHandle(() =>
    document.querySelector('.collapsible-row[data-expandable="true"][data-open="false"]')
  );
  assert.ok(await row.evaluate(el => !!el), 'there is a closed expandable row to test');
  const read = () =>
    row.evaluate(el => ({
      open: el.dataset.open,
      height: Math.round(el.querySelector('.row-panel').getBoundingClientRect().height),
      aria: el.querySelector('button')?.getAttribute('aria-expanded'),
      chevron: getComputedStyle(el.querySelector('.chevron-up')).transform,
    }));
  const trigger = await row.evaluateHandle(el => el.querySelector('button.row-trigger'));

  const closed = await read();
  await trigger.click();
  await page.waitForTimeout(450);
  const opened = await read();
  assert.equal(opened.open, 'true', 'clicking opens the row');
  assert.equal(opened.aria, 'true', 'aria-expanded follows the state');
  assert.ok(opened.height > closed.height + 10, `panel grows (${closed.height} -> ${opened.height})`);
  assert.notEqual(opened.chevron, closed.chevron, 'the chevron flips when open');

  await trigger.click();
  await page.waitForTimeout(450);
  const reclosed = await read();
  assert.equal(reclosed.open, 'false', 'clicking again closes it');
  assert.ok(reclosed.height < 5, 'panel collapses fully');
  console.log(
    `collapse: ${closed.height}px -> ${opened.height}px -> ${reclosed.height}px, chevron flips`
  );

  // --- a row with nothing to reveal is not a button ---
  const plainButtons = await page
    .locator('.collapsible-row[data-expandable="false"] button.row-trigger')
    .count();
  assert.equal(plainButtons, 0, 'rows with no description are not focusable buttons');

  // --- rows marked "open by default" start open ---
  const defaultOpen = content.education.filter(e => e.isExpanded).length;
  if (defaultOpen) {
    const open = await page.locator('.collapsible-row[data-open="true"]').count();
    assert.ok(open >= defaultOpen, `at least ${defaultOpen} row(s) start open, found ${open}`);
    console.log(`default : ${open} row(s) start open`);
  }

  // --- the two sections must be typographically identical ---
  // A school is an <h3> and a role an <h4>; the global `h1, h2, h3` rule puts
  // headings in the condensed display face, which made otherwise-identical rows
  // render in two different typefaces.
  await page.evaluate(() =>
    document
      .querySelectorAll('.collapsible-row[data-open="false"] button.row-trigger')
      .forEach(b => b.click())
  );
  await page.waitForTimeout(500);

  const type = await page.evaluate(() => {
    const style = el => {
      if (!el) return null;
      const c = getComputedStyle(el);
      return [c.fontSize, c.fontWeight, c.lineHeight, c.fontFamily.split(',')[0].replace(/"/g, '')].join(' / ');
    };
    // The section a heading belongs to.
    const up = el => el.closest('section');
    const heading = name =>
      [...document.querySelectorAll('h1,h2,h3')].find(h => (h.textContent || '').trim() === name);
    const exp = up(heading('Experience'));
    const edu = up(heading('Education'));
    return {
      title: [style(exp.querySelector('h4')), style(edu.querySelector('.collapsible-row h3'))],
      meta: [style(exp.querySelector('.collapsible-row dl')), style(edu.querySelector('.collapsible-row dl'))],
      description: [style(exp.querySelector('.row-panel-inner .markdown')), style(edu.querySelector('.row-panel-inner .markdown'))],
      tag: [style(exp.querySelector('li span')), style(edu.querySelector('li span'))],
    };
  });

  for (const [part, [inExperience, inEducation]] of Object.entries(type)) {
    assert.ok(inExperience && inEducation, `${part} is present in both sections`);
    assert.equal(
      inEducation,
      inExperience,
      `${part} must match across sections (experience "${inExperience}" vs education "${inEducation}")`
    );
  }
  console.log('type    : title/meta/description/tag identical across both sections');

  // --- bullet lists in descriptions ---
  // The renderer used to stamp the wrapper's classes onto every <p>, including ones
  // inside list items, which pushed each bullet's text away from its own marker.
  const lists = await page.evaluate(() => {
    const block = [...document.querySelectorAll('.markdown')].find(
      el => el.querySelectorAll('li').length > 1
    );
    if (!block) return null;
    const list = block.querySelector('ul, ol');
    const items = [...list.querySelectorAll(':scope > li')];
    return {
      count: items.length,
      // Layout classes must live on the wrapper only, never leak into the markup.
      leaked: [...block.querySelectorAll('*')].filter(el =>
        ['pl-9', 'markdown-description'].some(c => el.classList.contains(c))
      ).length,
      indent: parseFloat(getComputedStyle(list).paddingInlineStart),
      marker: getComputedStyle(items[0], '::marker').color,
      textColor: getComputedStyle(items[0]).color,
      // Every bullet's text must begin at the same x.
      starts: [...new Set(items.map(li => Math.round(li.getBoundingClientRect().left)))],
    };
  });
  assert.ok(lists, 'a description with a bullet list is on the page');
  assert.equal(lists.leaked, 0, 'wrapper classes must not leak onto list items');
  assert.ok(lists.indent > 8, `lists are indented, got ${lists.indent}px`);
  assert.equal(lists.starts.length, 1, 'every bullet starts at the same x');
  assert.notEqual(lists.marker, lists.textColor, 'markers are faded, not full text colour');
  console.log(
    `bullets : ${lists.count} items, ${lists.indent}px indent, markers faded, aligned`
  );

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: experience and education render, durations compute, rows collapse.');
} finally {
  await browser.close();
}
