// The 15-second clip that plays over the expanded album art.
//
// Spotify removed `preview_url` from its Web API (deprecated November 2024), so the
// clip is resolved from its embed player instead. That is an undocumented URL, so
// the first assertion here is really a canary: if Spotify stops serving it, this
// fails loudly rather than the feature quietly disappearing from the page.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const CMS = process.env.CMS_URL || 'http://127.0.0.1:1337';
const SITE = process.env.SITE_URL || 'http://127.0.0.1:4321';

// --- the endpoint resolves a real clip, and rejects nonsense ---
const status = await (await fetch(`${CMS}/api/spotify`)).json();
if (!['playing', 'recent'].includes(status.status)) {
  console.log(`SKIP: Spotify reports "${status.status}", so there is no track to preview.`);
  process.exit(0);
}

const resolved = await (
  await fetch(`${SITE}/api/spotify-preview?track=${encodeURIComponent(status.trackUrl)}`)
).json();
assert.ok(
  resolved.url,
  'no preview clip resolved -- Spotify may have stopped exposing it from the embed player'
);
assert.match(resolved.url, /^https:\/\/p\.scdn\.co\/mp3-preview\//, 'clip is a Spotify preview');

const rejected = await (await fetch(`${SITE}/api/spotify-preview?track=nonsense`)).json();
assert.equal(rejected.url, null, 'a bogus track resolves to nothing rather than erroring');
console.log('endpoint : resolves a clip for the current track, rejects bad input');

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

// The player uses `new Audio()`, which never enters the DOM, so capture the instance.
await page.addInitScript(() => {
  const Native = window.Audio;
  window.Audio = function (...args) {
    const element = new Native(...args);
    window.__clip = element;
    return element;
  };
  window.Audio.prototype = Native.prototype;
});

try {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.querySelector('astro-dev-toolbar')?.remove());
  await page.waitForFunction(
    () => {
      const wrap = document.querySelector('.album-peek-wrap');
      return wrap && !wrap.hidden;
    },
    null,
    { timeout: 15000 }
  );

  // Real pointer movement: the open/close rules hinge on pointerenter and
  // pointerleave treating the enlarged artwork as part of the icon's subtree.
  await page.evaluate(() =>
    document.querySelector('.album-peek-wrap').scrollIntoView({ block: 'center' })
  );
  await page.waitForTimeout(400);

  const state = () =>
    page.evaluate(() => {
      const wrap = document.querySelector('.album-peek-wrap');
      const disc = wrap.querySelector('.album-disc');
      const ring = wrap.querySelector('.ring-fill');
      const discStyle = getComputedStyle(disc);
      return {
        open: wrap.dataset.open,
        playing: wrap.dataset.playing,
        radius: discStyle.borderTopLeftRadius,
        spinning: discStyle.animationName !== 'none',
        ringOpacity: Number(getComputedStyle(wrap.querySelector('.album-ring')).opacity),
        ringOffset: Math.round(parseFloat(ring.style.strokeDashoffset || '0')),
        playOpacity: Number(getComputedStyle(wrap.querySelector('.album-play')).opacity),
        thumbOpacity: Number(getComputedStyle(wrap.querySelector('.album-thumb')).opacity),
      };
    });

  const icon = await page.locator('.album-peek').boundingBox();
  const centre = { x: icon.x + icon.width / 2, y: icon.y + icon.height / 2 };
  const away = async () => {
    await page.mouse.move(10, 10, { steps: 8 });
    await page.waitForTimeout(700);
  };
  const onIcon = async () => {
    await page.mouse.move(centre.x, centre.y, { steps: 4 });
    await page.waitForTimeout(600);
  };

  // 1. hovering the icon expands it
  await onIcon();
  let now = await state();
  assert.equal(now.open, 'true', 'hovering the icon expands the artwork');
  assert.ok(now.playOpacity > 0.9, 'the play control appears with it');

  // 1b. moving onto the enlarged artwork keeps it open
  await page.mouse.move(centre.x, centre.y - 60, { steps: 8 });
  await page.waitForTimeout(400);
  assert.equal((await state()).open, 'true', 'staying on the artwork keeps it open');

  // Only one copy of the cover is ever on screen.
  assert.equal((await state()).thumbOpacity, 0, 'the thumbnail hides behind the enlarged art');

  // 3. an idle preview folds away when the pointer leaves
  await away();
  assert.equal((await state()).open, 'false', 'an idle preview closes when the pointer leaves');
  console.log('hover    : opens, stays open over the art, closes when idle');

  // 5. playing rounds the art into a spinning disc
  await onIcon();
  await page.waitForFunction(() => !document.querySelector('.album-play').hidden, null, {
    timeout: 15000,
  });
  await page.locator('.album-play').click();
  await page.waitForTimeout(900);
  now = await state();
  assert.equal(now.playing, 'true', 'clicking plays');
  const roundness = value => (value.includes('%') ? parseFloat(value.replace(/[^\d.]/g, '')) : 0);
  assert.ok(roundness(now.radius) > 45, `the artwork rounds into a disc, got ${now.radius}`);
  assert.ok(now.spinning, 'and spins');
  assert.ok(now.ringOpacity > 0.9, 'the progress ring appears');
  console.log('playing  : disc is round, spinning, ring shown');

  // 4. a playing clip survives the pointer leaving
  await away();
  now = await state();
  assert.equal(now.open, 'true', 'a playing preview stays open when the pointer leaves');
  assert.equal(now.playing, 'true', 'and keeps playing');

  // 6. the ring fills as the clip runs
  const before = await state();
  await page.waitForTimeout(2500);
  const after = await state();
  assert.ok(
    after.ringOffset < before.ringOffset - 20,
    `the ring fills as it plays (${before.ringOffset} -> ${after.ringOffset})`
  );
  console.log(`ring     : ${before.ringOffset} -> ${after.ringOffset} as the clip runs`);

  // 7. pausing by hand returns the square, and only then does leaving close it
  await onIcon();
  await page.locator('.album-play').click();
  await page.waitForTimeout(700);
  now = await state();
  assert.equal(now.playing, 'false', 'the button pauses');
  assert.ok(roundness(now.radius) < 20, `the disc returns to a square, got ${now.radius}`);
  assert.equal(now.open, 'true', 'and stays open while the pointer is still on it');
  await away();
  assert.equal((await state()).open, 'false', 'then closes once the pointer leaves');
  console.log('pause    : back to a square, closes after the pointer leaves');

  // 6b. a clip left to run closes itself at the end
  await onIcon();
  await page.locator('.album-play').click();
  await page.waitForTimeout(500);
  await away();
  await page.waitForFunction(
    () => document.querySelector('.album-peek-wrap').dataset.playing === 'false',
    null,
    { timeout: 22000 }
  );
  await page.waitForTimeout(400);
  now = await state();
  assert.equal(now.open, 'false', 'the player folds away when the clip completes');
  assert.equal(now.ringOffset, Math.round(2 * Math.PI * 61), 'the ring resets');
  console.log('finish   : folds away at the end of the clip');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: preview resolves, shows only when expanded, crossfades, stops at 15s.');
} finally {
  await browser.close();
}
