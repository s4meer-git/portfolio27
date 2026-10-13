import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, timeout: 30000 });
const url = process.env.SITE_URL || 'http://127.0.0.1:4321';
const cms = await (await fetch(process.env.CMS_URL || 'http://127.0.0.1:1337/api/portfolio')).json();
const profile = cms.site.profile;
const media = value => new URL(value.url, 'http://127.0.0.1:1337').href;
const logos = { fortnite: media(profile.avatarShirt.logo), ...Object.fromEntries(profile.avatarVariants.map(item => [item.key, media(item.shirt.logo)])) };
const isVariant = (url, key, theme) => { const u = new URL(url); return u.pathname === '/api/portrait' && u.searchParams.get('variant') === key && (!theme || u.searchParams.get('theme') === theme); };
const pageReady = page => page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'), null, { timeout: 30000 });
const settled = page => page.waitForFunction(() => {
  const root = document.querySelector('portrait-switch');
  return !root.hasAttribute('data-transforming') && !root.querySelector('[aria-disabled="true"]');
}, null, { timeout: 10000 });
const shirtMatches = async (page, logo, color) => {
  const front = page.locator('.shirt-item[data-position="front"]');
  assert.equal(await front.getAttribute('data-shirt'), await page.locator('portrait-switch').getAttribute('data-active'), 'current portrait stays on the front hanger');
  const shown = await front.locator('.badge-face').evaluateAll(faces => faces
    .filter(face => Number(getComputedStyle(face).opacity) > .99)
    .map(face => face.querySelector('img').getAttribute('src')));
  assert.deepEqual(shown, [logo], 'shirt shows only the current portrait logo');
  assert.equal(await front.locator('.shirt-body').evaluate(el => getComputedStyle(el).fill), color, 'shirt color matches the current portrait');
};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'light' });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  // The development toolbar also fetches images to audit them; count image loads.
  page.on('request', req => { if (req.resourceType() === 'image') requests.push(req.url()); });
  await page.goto(url, { waitUntil: 'networkidle' });
  await pageReady(page);
  const portrait = page.locator('portrait-switch');
  const lego = page.getByRole('button', { name: 'Switch to LEGO portrait', exact: true });
  const gta6 = page.getByRole('button', { name: 'Switch to GTA VI portrait', exact: true });
  const fortnite = page.getByRole('button', { name: 'Switch to Fortnite portrait', exact: true });
  await lego.waitFor({ state: 'visible' });
  assert.equal(await portrait.getAttribute('data-active'), 'fortnite');
  await shirtMatches(page, logos.fortnite, 'rgb(23, 23, 26)');
  assert.equal(requests.some(url => isVariant(url, 'lego') || isVariant(url, 'gta6') || /\/portraits\/fog-/.test(url)), false, 'hidden portraits and fog do not download at startup');
  assert.equal(requests.filter(url => /\/api\/portrait\?/.test(url)).length, 1, JSON.stringify(requests.filter(url => /\/api\/portrait\?/.test(url))));
  assert.equal(await page.locator('[data-portrait="fortnite"] img').evaluate(img => img.naturalWidth), 480);
  const before = await portrait.boundingBox();
  await page.screenshot({ path: '/tmp/portrait-fortnite.png' });
  await portrait.evaluate(root => {
    window.shirtPeekStarts = [];
    new MutationObserver(() => {
      if (root.hasAttribute('data-peeking')) window.shirtPeekStarts.push(performance.now());
    }).observe(root, { attributes: true, attributeFilter: ['data-peeking'] });
  });
  const frontBefore = await page.locator('.shirt-item[data-position="front"]').boundingBox();
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-peeking'), null, { timeout: 7000 });
  await page.waitForTimeout(750);
  const peek = await page.locator('.shirt-item').evaluateAll(shirts => shirts.map(shirt => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(shirt).transform);
    const hook = new DOMPoint(32, -10).matrixTransform(shirt.querySelector('.shirt-hanger').getScreenCTM());
    return { position: shirt.dataset.position, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, x: matrix.m41, y: matrix.m42, hook: { x: hook.x, y: hook.y } };
  }));
  assert.ok(peek.find(shirt => shirt.position === 'near').angle < -10, 'next vest fans out to the right');
  assert.ok(peek.find(shirt => shirt.position === 'far').angle < -20, 'third vest fans farther out');
  for (const shirt of peek) {
    assert.equal(shirt.x, 0, 'vest rotation has no horizontal slide');
    assert.equal(shirt.y, 0, 'vest rotation has no vertical slide');
    const anchor = peek.find(shirt => shirt.position === 'front').hook;
    assert.ok(Math.hypot(shirt.hook.x - anchor.x, shirt.hook.y - anchor.y) < .1, 'all vest hooks stay at the same fixed pivot');
  }
  assert.deepEqual(await page.locator('.shirt-item[data-position="front"]').boundingBox(), frontBefore, 'current shirt stays fixed during the peek');
  assert.equal(await portrait.getAttribute('data-active'), 'fortnite', 'peeking does not change the portrait');
  await page.screenshot({ path: '/tmp/portrait-shirts-peek.png', clip: { x: before.x - 12, y: before.y - 14, width: before.width + 42, height: before.height + 28 } });
  await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-peeking'));
  assert.equal(await page.locator('.shirt-item').evaluateAll(shirts => shirts.flatMap(shirt => shirt.getAnimations()).length), 0, 'resting shirts perform no animation work');
  await page.waitForFunction(() => window.shirtPeekStarts.length === 2, null, { timeout: 7000 });
  const cadence = await page.evaluate(() => window.shirtPeekStarts[1] - window.shirtPeekStarts[0]);
  assert.ok(Math.abs(cadence - 5000) < 250, `shirts peek every five seconds (${cadence}ms)`);
  await portrait.evaluate(root => {
    window.portraitCover = [];
    new MutationObserver(() => window.portraitCover.push(Number(getComputedStyle(root.querySelector('.magic-veil')).opacity)))
      .observe(root, { attributes: true, attributeFilter: ['data-active'] });
    // Freeze the first swap for a deterministic pre-midpoint sample, even on a busy machine.
    const pause = new MutationObserver(() => {
      if (!root.hasAttribute('data-transforming')) return;
      root.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = 0; });
      pause.disconnect();
    });
    pause.observe(root, { attributes: true, attributeFilter: ['data-transforming'] });
  });
  await page.getByRole('button', { name: 'Change photo to LEGO portrait', exact: true }).click();
  assert.equal(await portrait.getAttribute('data-peeking'), null, 'portrait switching settles the peek');
  await page.locator('.portrait-trigger').hover();
  assert.equal(await portrait.getAttribute('data-peeking'), null, 'hover waits while a portrait swap is busy');
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-transforming'));
  assert.deepEqual(await page.locator('[data-shirt-swap="incoming"]').evaluate(shirt => {
    const timing = shirt.getAnimations().find(animation => animation.animationName === 'shirt-to-front').effect.getTiming();
    return { duration: timing.duration, delay: timing.delay };
  }), { duration: 640, delay: 640 }, 'shirt switch is three times faster and centered on the photo swap');
  await portrait.evaluate(root => root.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 900; }));
  const shirtSwap = await page.locator('.shirt-item').evaluateAll(shirts => shirts.map(shirt => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(shirt).transform);
    const hook = new DOMPoint(32, -10).matrixTransform(shirt.querySelector('.shirt-hanger').getScreenCTM());
    return { role: shirt.dataset.shirtSwap, position: shirt.dataset.position, name: shirt.dataset.shirt, angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, x: matrix.m41, y: matrix.m42, hook: { x: hook.x, y: hook.y } };
  }));
  const incoming = shirtSwap.find(shirt => shirt.role === 'incoming');
  const outgoing = shirtSwap.find(shirt => shirt.role === 'outgoing');
  assert.equal(incoming.name, 'lego');
  assert.equal(incoming.position, 'near', 'next shirt starts behind the current shirt');
  assert.ok(incoming.angle < -35 && outgoing.angle > 25, 'shirts part around the hook before exchanging depth');
  assert.equal(incoming.x, 0);
  assert.equal(incoming.y, 0);
  assert.ok(Math.hypot(incoming.hook.x - outgoing.hook.x, incoming.hook.y - outgoing.hook.y) < .1, 'swap rotation keeps both hooks fixed');
  await page.screenshot({ path: '/tmp/portrait-shirt-swap.png', clip: { x: before.x - 12, y: before.y - 14, width: before.width + 54, height: before.height + 28 } });
  await portrait.evaluate(root => root.getAnimations({ subtree: true }).forEach(animation => animation.play()));
  await page.waitForFunction(() => document.querySelector('portrait-switch').dataset.active === 'lego');
  assert.equal(await page.locator('[data-shirt="lego"]').getAttribute('data-position'), 'front', 'incoming shirt moves to the front with its portrait');
  assert.equal(await page.locator('[data-shirt="fortnite"]').getAttribute('data-position'), 'far', 'previous shirt moves to the back');
  assert.ok((await page.evaluate(() => window.portraitCover[0])) >= .99, 'fog fully covers the actual image swap');
  await page.screenshot({ path: '/tmp/portrait-cloud.png' });
  await settled(page);
  assert.equal(await portrait.getAttribute('data-shirt-swapping'), null, 'shirt swap cleans up after settling');
  assert.equal(await gta6.isVisible(), true);
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-peeking'), null, { timeout: 1500 });
  await gta6.hover();
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-peeking'));
  const hoverStarts = await page.evaluate(() => window.shirtPeekStarts.length);
  await gta6.dispatchEvent('pointerenter', { pointerType: 'mouse' });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(750);
  assert.equal(await page.evaluate(() => window.shirtPeekStarts.length), hoverStarts, 'hover does not restart a running peek');
  assert.equal(await portrait.getAttribute('data-active'), 'lego', 'hover keeps the current portrait');
  assert.ok(await page.locator('.shirt-item[data-position="far"]').evaluate(shirt => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(shirt).transform);
    return Math.atan2(matrix.b, matrix.a) * 180 / Math.PI < -20;
  }), 'hover uses the same full fan motion and finishes smoothly after leaving');
  await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-peeking'));
  await gta6.hover();
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-peeking'));
  const reentryStarts = await page.evaluate(() => window.shirtPeekStarts.length);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1100);
  await gta6.hover();
  await page.waitForFunction(count => window.shirtPeekStarts.length === count + 1, reentryStarts, { timeout: 2500 });
  assert.equal(await portrait.getAttribute('data-active'), 'lego', 're-entering during the return queues another peek');
  await page.mouse.move(0, 0);
  await page.waitForFunction(() => !document.querySelector('portrait-switch').hasAttribute('data-peeking'));
  await shirtMatches(page, logos.lego, 'rgb(227, 0, 11)');
  assert.equal(await page.locator('.badge-gta6 img').evaluate((img, logo) => img.complete && img.naturalWidth > 0 && img.getAttribute('src') === logo, logos.gta6), true, 'Rockstar logo is loaded for the purple GTA VI shirt');
  assert.equal(requests.some(url => isVariant(url, 'gta6')), false, 'GTA VI stays deferred while LEGO is selected');
  assert.deepEqual(await portrait.boundingBox(), before, 'switch does not move the layout');
  assert.equal(await page.locator('[data-portrait="lego"] img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await page.screenshot({ path: '/tmp/portrait-lego-light.png' });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(() => document.querySelector('[data-portrait="lego"] img').dataset.theme === 'dark');
  await shirtMatches(page, logos.lego, 'rgb(227, 0, 11)');
  await page.screenshot({ path: '/tmp/portrait-lego-dark.png' });
  await page.getByRole('button', { name: 'Change photo to GTA VI portrait', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.locator('.portrait-trigger').evaluate(el => { el.click(); el.click(); });
  await settled(page);
  assert.equal(await portrait.getAttribute('data-active'), 'gta6', 'rapid input only switches once');
  await shirtMatches(page, logos.gta6, 'rgb(101, 50, 118)');
  assert.equal(await fortnite.isVisible(), true);
  assert.deepEqual(await portrait.boundingBox(), before, 'GTA VI keeps the same layout');
  assert.equal(await page.locator('[data-portrait="gta6"] img').evaluate(img => img.complete && img.naturalWidth === 480 && img.dataset.theme === 'dark'), true);
  assert.equal(requests.some(url => isVariant(url, 'gta6', 'light')), false, 'only the selected GTA VI theme downloads');
  await page.screenshot({ path: '/tmp/portrait-gta6-dark.png' });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForFunction(() => document.querySelector('[data-portrait="gta6"] img').dataset.theme === 'light');
  await page.screenshot({ path: '/tmp/portrait-gta6-light.png' });
  await fortnite.click();
  await settled(page);
  assert.equal(await portrait.getAttribute('data-active'), 'fortnite', 'three portraits cycle back to the original');
  await shirtMatches(page, logos.fortnite, 'rgb(23, 23, 26)');
  assert.ok((await page.evaluate(() => window.portraitCover)).every(opacity => opacity >= .99), 'fog covers all three swaps');
  // The hovered hint returns after the fog clears; let its brief transition finish.
  await page.waitForFunction(() => document.querySelector('portrait-switch').getAnimations({ subtree: true }).length === 0, null, { timeout: 2000 });
  assert.equal(await portrait.evaluate(root => root.getAnimations({ subtree: true }).length), 0, 'no portrait animations survive completion');

  // Disconnect during a running switch, then reconnect the same element.
  await lego.click();
  await page.waitForFunction(() => document.querySelector('portrait-switch').hasAttribute('data-transforming'));
  // Keep this cleanup check independent of the intentional peek on a new hover.
  await page.mouse.move(0, 0);
  await portrait.evaluate(root => { const parent = root.parentElement; root.remove(); parent.append(root); });
  await settled(page);
  assert.equal(await portrait.evaluate(root => root.getAnimations({ subtree: true }).filter(a => a instanceof CSSAnimation).length), 0, 'reconnection clears the portrait effect');
  // Reattaching under the pointer can start the normal badge/orbit hover transitions.
  await page.waitForFunction(() => document.querySelector('portrait-switch').getAnimations({ subtree: true }).length === 0, null, { timeout: 2000 });
  assert.equal(await portrait.evaluate(root => root.getAnimations({ subtree: true }).length), 0);
  await lego.click();
  await settled(page);
  assert.equal(await portrait.getAttribute('data-active'), 'lego', 'reconnected controls work without duplicate handlers');
  await page.reload({ waitUntil: 'networkidle' });
  await pageReady(page);
  await lego.click();
  await settled(page);
  assert.equal(await portrait.getAttribute('data-active'), 'lego');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('portrait-switch').getBoundingClientRect().bottom < 0);
  const offscreenStarts = await portrait.evaluate(root => {
    window.offscreenPeeks = 0;
    new MutationObserver(() => {
      if (root.hasAttribute('data-peeking')) window.offscreenPeeks++;
    }).observe(root, { attributes: true, attributeFilter: ['data-peeking'] });
    return window.offscreenPeeks;
  });
  await page.waitForTimeout(5500);
  assert.equal(await page.evaluate(() => window.offscreenPeeks), offscreenStarts, 'off-screen shirts do not animate');
  assert.deepEqual(errors, [], 'no browser errors');
  await page.locator('[data-portrait="gta6"] img').evaluate(img => { img.dataset.lightSrc = '/missing-shirt-swap-test.webp'; });
  await page.getByRole('button', { name: 'Change photo to GTA VI portrait', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-portrait-status]').textContent.includes('could not load'));
  assert.equal(await portrait.getAttribute('data-active'), 'lego', 'failed image leaves the current shirt and photo selected');
  assert.equal(await portrait.getAttribute('data-shirt-swapping'), null, 'failed image clears the paused shirt swap');
  await shirtMatches(page, logos.lego, 'rgb(227, 0, 11)');

  const mobile = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  const mobileRequests = [];
  mobile.on('request', req => mobileRequests.push(req.url()));
  await mobile.goto(url, { waitUntil: 'networkidle' });
  await pageReady(mobile);
  const mobileLego = mobile.getByRole('button', { name: 'Switch to LEGO portrait', exact: true });
  assert.ok((await mobileLego.boundingBox()).height >= 44, 'touch target is at least 44px');
  await mobile.getByRole('button', { name: 'Change photo to LEGO portrait', exact: true }).tap();
  await settled(mobile);
  assert.equal(await mobile.locator('portrait-switch').getAttribute('data-active'), 'lego');
  await shirtMatches(mobile, logos.lego, 'rgb(227, 0, 11)');
  assert.equal(await mobile.locator('portrait-switch').getAttribute('data-transforming'), null, 'reduced motion skips clouds');
  assert.equal(await mobile.locator('.shirt-item').evaluateAll(shirts => shirts.flatMap(shirt => shirt.getAnimations()).length), 0, 'reduced motion keeps the hanger stack still');
  assert.equal(mobileRequests.some(url => /\/fog-/.test(url)), false, 'reduced motion never loads fog textures');
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'no mobile overflow');
  await mobile.screenshot({ path: '/tmp/portrait-mobile.png' });
  await mobile.getByRole('button', { name: 'Switch to GTA VI portrait', exact: true }).tap();
  await settled(mobile);
  assert.equal(await mobile.locator('portrait-switch').getAttribute('data-active'), 'gta6');
  await shirtMatches(mobile, logos.gta6, 'rgb(101, 50, 118)');
  await mobile.screenshot({ path: '/tmp/portrait-gta6-mobile.png' });
  await mobile.getByRole('button', { name: 'Switch to Fortnite portrait', exact: true }).tap();
  await settled(mobile);
  const legoSource = await mobile.locator('[data-portrait="lego"] img').getAttribute('data-light-src');
  await mobile.locator('[data-portrait="lego"] img').evaluate(img => { img.dataset.lightSrc = '/missing-portrait-test.webp'; });
  await mobileLego.tap();
  await mobile.waitForFunction(() => document.querySelector('[data-portrait-status]').textContent.includes('could not load'));
  assert.equal(await mobile.locator('portrait-switch').getAttribute('data-active'), 'fortnite');
  await shirtMatches(mobile, logos.fortnite, 'rgb(23, 23, 26)');
  assert.equal(await mobileLego.getAttribute('aria-disabled'), null);
  await mobile.locator('[data-portrait="lego"] img').evaluate((img, src) => { img.dataset.lightSrc = src; }, legoSource);
  await mobileLego.tap();
  await settled(mobile);
  assert.equal(await mobile.locator('portrait-switch').getAttribute('data-active'), 'lego', 'retry works after a failed image');

  const dark = await browser.newPage({ colorScheme: 'dark' });
  const darkRequests = [];
  dark.on('request', req => { if (req.resourceType() === 'image' && /\/api\/portrait\?/.test(req.url())) darkRequests.push(req.url()); });
  await dark.goto(url, { waitUntil: 'networkidle' });
  await pageReady(dark);
  assert.equal(darkRequests.length, 1);
  assert.match(darkRequests[0], /theme=dark/, 'first dark-theme paint fetches only the dark portrait');
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(url, { waitUntil: 'networkidle' });
  await pageReady(noJS);
  assert.equal(await noJS.locator('portrait-switch noscript img').evaluate(img => img.complete && img.naturalWidth === 480), true, 'no-JS fallback works');
  console.log('PASS: hanger stack matches current portrait, hover and five-second staggered peek/return, no resting/off-screen animation work, Fortnite/LEGO/GTA VI cycle, deferred images, both themes, opaque fog, keyboard/touch, disconnect cleanup, reduced motion, failures/retry, and no-JS fallback.');
} finally { await browser.close(); }
