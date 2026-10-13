// Certification Cover Flow: tickets built from the CMS (with server-rendered QR codes),
// repeated into a loop so the stacks look full, browsed by scroll, click, keys,
// buttons and drag, while the front ticket's Verify link still opens the credential.
import { chromium, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const counter = page => page.textContent('#certifications [data-current]');
const settle = page => page.waitForTimeout(900);
try {
  const errors = [];
  const { certifications } = await (await fetch(`${cms}/api/portfolio`)).json();
  const n = certifications.length;
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });

  const tickets = page.locator('#certifications .ticket');
  const total = await tickets.count();
  assert.ok(total >= 15 && total % n === 0, `the loop repeats the ${n} real tickets (${total})`);
  assert.equal(await page.locator('#certifications .ticket:not([aria-hidden])').count(), n, 'only real tickets are exposed to assistive tech');
  const withLinks = certifications.filter(item => /^https?:/.test(item.credentialUrl || '')).length;
  assert.equal(await page.locator('#certifications .ticket:not([aria-hidden]) .ticket-qr svg').count(), withLinks, 'a QR code per verification link');

  const stage = page.locator('#certifications .flow-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(await counter(page), '01');

  const scrollBefore = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120);
  await settle(page);
  assert.equal(await counter(page), '02', 'scrolling over the section browses');
  assert.equal(await page.evaluate(() => scrollY), scrollBefore, 'without scrolling the page');

  // Click the nearest ticket in the left stack: it comes to the front.
  const left = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#certifications .ticket')];
    const front = cards.find(card => card.hasAttribute('data-front'));
    const previous = cards[(Number(front.dataset.slot) - 1 + cards.length) % cards.length];
    const r = previous.getBoundingClientRect();
    // Find a point where the previous ticket itself is what the pointer would hit.
    for (let x = r.left + 4; x < r.right; x += 4)
      for (const y of [r.top + r.height * 0.5, r.top + r.height * 0.3, r.top + r.height * 0.7])
        if (document.elementFromPoint(x, y)?.closest('.ticket') === previous) return { x, y };
  });
  await page.mouse.click(left.x, left.y);
  await settle(page);
  assert.equal(await counter(page), '01', 'clicking the previous ticket brings it forward');

  await stage.focus();
  await page.keyboard.press('ArrowLeft');
  await settle(page);
  assert.equal(await counter(page), String(n).padStart(2, '0'), 'arrow keys browse and wrap around');
  await page.click('#certifications .flow-button[data-step="1"]');
  await settle(page);
  assert.equal(await counter(page), '01', 'buttons browse');

  const verify = page.locator('#certifications .ticket[data-front] .ticket-verify');
  assert.equal(await verify.getAttribute('href'), new URL(certifications[0].credentialUrl).href);
  const [popup] = await Promise.all([page.context().waitForEvent('page'), verify.click()]);
  await popup.close();
  assert.equal(await counter(page), '01', 'Verify opens the link without moving the flow');

  for (const width of [320, 390]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height: 800 } });
    const phone = await context.newPage();
    phone.on('pageerror', error => errors.push(error.message));
    await phone.goto(base, { waitUntil: 'networkidle' });
    await phone.locator('#certifications .flow-stage').scrollIntoViewIfNeeded();
    await phone.waitForTimeout(300);
    const front = await phone.locator('#certifications .ticket[data-front]').boundingBox();
    assert.ok(front.x >= 0 && front.x + front.width <= width, `${width}px: front ticket fits`);
    const s = await phone.locator('#certifications .flow-stage').boundingBox();
    const y = s.y + s.height / 2;
    const cdp = await context.newCDPSession(phone);
    const touch = (type, x) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', s.x + s.width * 0.8);
    for (let i = 1; i <= 8; i++) await touch('touchMove', s.x + s.width * (0.8 - 0.045 * i));
    await touch('touchEnd');
    await phone.waitForTimeout(900);
    assert.notEqual(await counter(phone), '01', `${width}px: swiping browses`);
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, 'no sideways scroll');
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: ${n} tickets looped into ${total}, QR per link; scroll, click, keys, buttons and drag browse; Verify opens; fits 320–390px.`);
} finally {
  await browser.close();
}
