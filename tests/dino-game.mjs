// Drives the dino game in a real browser: rendering, controls, collision, scoring,
// the high score, and night mode flipping the whole site's theme.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const SITE = process.env.SITE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__played = [];
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) {
    window.__played.push(this.buffer ? +this.buffer.duration.toFixed(2) : 0);
    return start.apply(this, args);
  };
});
const errors = [];
page.on('pageerror', e => errors.push(e.message));

const game = () => page.evaluate(() => {
  const g = document.querySelector('.dino-root').dinoGame;
  return {
    ready: !!g.spriteImage, playing: g.playing, crashed: g.crashed,
    scale: g.scale, worldWidth: Math.round(g.worldWidth),
    obstacles: g.obstacles.length, clouds: g.clouds.length,
    score: Math.round(g.distanceRan * 0.025), high: g.highestScore,
    trexY: Math.round(g.trex.yPos), ground: Math.round(g.trex.groundYPos),
    status: g.trex.status, inverted: g.inverted,
    dark: document.documentElement.classList.contains('dark'),
  };
});

try {
  await page.goto(SITE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.dino-root')?.dinoGame?.spriteImage, null, { timeout: 15000 });
  const strip = await page.locator('.dino-strip').boundingBox();
  console.log('strip size:', Math.round(strip.width) + 'x' + Math.round(strip.height));

  let s = await game();
  console.log('loaded  :', JSON.stringify(s));
  assert.ok(s.ready, 'sprite sheet loaded');
  assert.equal(s.status, 'WAITING', 'dino idles before the first input');

  // The dotted background must still be painted underneath the canvas.
  const dots = await page.evaluate(() => {
    const el = document.querySelector('.dino-strip');
    return getComputedStyle(el, '::before').backgroundImage;
  });
  assert.ok(dots.includes('radial-gradient'), 'dotted pattern still present');
  console.log('dots    : present');

  // --- spacebar alone starts the game, and must not scroll the page ---
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  s = await game();
  const scrollAfter = await page.evaluate(() => window.scrollY);
  assert.ok(s.playing, 'spacebar starts the game without clicking first');
  assert.equal(scrollAfter, scrollBefore, 'spacebar does not scroll the page while playing');
  console.log('spacebar: starts the game, page stayed at y=' + scrollAfter);

  const hop = await page.evaluate(async () => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.obstacles = [];
    g.trex.yPos = g.trex.groundYPos;
    g.trex.jumping = false;
    g.startJump();
    let min = Infinity, frames = 0;
    while (g.trex.jumping && frames++ < 200) {
      await new Promise(r => requestAnimationFrame(r));
      min = Math.min(min, g.trex.yPos);
    }
    return { apex: Math.round(min), ground: Math.round(g.trex.groundYPos), frames };
  });
  assert.ok(hop.apex < hop.ground, 'dino leaves the ground when jumping');
  console.log('jump    : apex y=' + hop.apex + ' ground=' + hop.ground + ' airborne ' + hop.frames + ' frames');

  // The whole arc must stay inside the visible strip, at slow and at top speed.
  for (const speed of [6, 13]) {
    const apex = await page.evaluate(async spd => {
      const g = document.querySelector('.dino-root').dinoGame;
      g.obstacles = [];
      g.currentSpeed = spd;
      g.trex.yPos = g.trex.groundYPos;
      g.trex.jumping = false;
      g.startJump();
      let min = Infinity;
      for (let i = 0; i < 90; i++) {
        await new Promise(r => requestAnimationFrame(r));
        min = Math.min(min, g.trex.yPos);
      }
      return { min: Math.round(min), clears: Math.round(min) < 52 };
    }, speed);
    console.log('arc     : speed ' + speed + ' apex y=' + apex.min + ', clears large cactus=' + apex.clears);
    assert.ok(apex.min >= 0, 'jump apex stays in view at speed ' + speed + ' (got ' + apex.min + ')');
    assert.ok(apex.clears, 'jump still clears a large cactus at speed ' + speed);
  }
  await page.evaluate(() => { const g = document.querySelector('.dino-root').dinoGame; g.currentSpeed = 6; });

  // --- obstacles and score appear over time ---
  await page.waitForTimeout(2500);
  s = await game();
  console.log('running :', JSON.stringify(s));
  assert.ok(s.score > 0, 'score increases');
  assert.ok(s.obstacles > 0, 'obstacles spawn');

  // --- ducking (clear the field first so the run survives long enough) ---
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    if (g.crashed) g.restart();
    g.obstacles = [];
  });
  await page.waitForTimeout(150);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  const ducking = await page.evaluate(() => document.querySelector('.dino-root').dinoGame.trex.ducking);
  await page.keyboard.up('ArrowDown');
  assert.ok(ducking, 'down arrow ducks');
  console.log('duck    : ok');

  // --- night mode must flip the whole site to dark ---
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.obstacles = [];
    g.distanceRan = 699 / 0.025;   // just short of the 700-point flip
  });
  await page.waitForTimeout(900);
  s = await game();
  console.log('night   : score=' + s.score + ' inverted=' + s.inverted + ' siteDark=' + s.dark);
  assert.ok(s.inverted, 'game switches to night mode at 700');
  assert.ok(s.dark, 'night mode turns the whole portfolio dark');
  assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'dark', 'theme persisted');

  // --- crash records a high score ---
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.gameOver();
  });
  await page.waitForTimeout(200);
  s = await game();
  assert.ok(s.crashed, 'game over');
  assert.ok(s.high >= 700, 'high score recorded: ' + s.high);
  const stored = await page.evaluate(() => localStorage.getItem('dino-high-score'));
  console.log('gameover: high=' + s.high + ' stored=' + stored);
  assert.equal(Number(stored), s.high, 'high score persisted to localStorage');

  // --- restart ---
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  s = await game();
  assert.ok(!s.crashed && s.playing, 'Enter restarts after the game-over delay');
  console.log('restart : ok, score reset to ' + s.score);

  // --- high score survives a reload ---
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.dino-root')?.dinoGame?.spriteImage, null, { timeout: 15000 });
  const afterReload = await game();
  assert.ok(afterReload.high >= 700, 'high score survives reload: ' + afterReload.high);
  console.log('reload  : high=' + afterReload.high);

  // --- the spacebar must still scroll the page when the game is not in view ---
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => window.scrollY);
  await page.evaluate(() => document.body.focus());
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => window.scrollY);
  assert.notEqual(after, before, 'space scrolls the page once the game is out of view');
  console.log('scroll  : space still scrolls the page (' + before + ' -> ' + after + ')');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // --- the ground must tile the full width at every size ---
  for (const [w, h] of [[1440, 900], [820, 1000], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => {
      const d = document.querySelector('.dino-root').dinoGame;
      const covered = d.horizonLines.length * 600;
      return { world: Math.round(d.worldWidth), covered, scale: +d.scale.toFixed(2) };
    });
    assert.ok(g.covered >= g.world, `ground covers the playfield at ${w}px (${g.covered} >= ${g.world})`);
    console.log(`layout  : ${w}px -> world ${g.world}, ground ${g.covered}, scale ${g.scale}`);
  }

  // --- birds drift slightly around the ground speed, they do not fly 1.8x/0.2x ---
  const drift = await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.play();
    g.stopLoop();
    g.currentSpeed = 9;
    const DELTA = 1000 / 60, STEPS = 60;
    const bird = offset => ({
      type: 'PTERODACTYL', width: 46, spriteWidth: 46, height: 40, size: 1,
      xPos: 1000, yPos: 75, collisionBoxes: [], speedOffset: offset,
      numFrames: 2, frameRate: 1000 / 6, currentFrame: 0, frameTimer: 0, gap: 9999,
    });
    const measure = offset => {
      g.obstacles = [bird(offset)];
      g.trex.yPos = -500;
      const x0 = g.obstacles[0].xPos;
      for (let i = 0; i < STEPS; i++) g.updateObstacles(DELTA);
      return (x0 - g.obstacles[0].xPos) / STEPS;
    };
    const r = { speed: g.currentSpeed, fast: measure(0.8), slow: measure(-0.8), cactus: measure(0) };
    g.startLoop();
    return r;
  });
  for (const [label, value, expected] of [
    ['cactus', drift.cactus, drift.speed],
    ['fast bird', drift.fast, drift.speed + 0.8],
    ['slow bird', drift.slow, drift.speed - 0.8],
  ]) {
    assert.ok(
      Math.abs(value - expected) < 1.2,
      `${label} moves at ~${expected} units/frame, got ${value}`
    );
  }
  console.log('bird    : ground ' + drift.cactus + ', birds ' + drift.slow + '/' + drift.fast +
              ' units per frame (speed ' + drift.speed + ' +/- 0.8)');

  // --- only the dots inside the column are lightened; the full-bleed sides
  //     either side of the content column must still match a plain strip ---
  const pattern = await page.evaluate(() => {
    const d = document.querySelector('.dino-strip');
    const plain = [...document.querySelectorAll('.screen-line-before')]
      .find(e => !e.classList.contains('dino-strip'));
    const before = el => {
      const cs = getComputedStyle(el, '::before');
      return cs.opacity + '|' + cs.backgroundImage;
    };
    const scrim = getComputedStyle(document.querySelector('.dino-root')).backgroundColor;
    return { game: before(d), plain: before(plain), scrim };
  });
  assert.equal(
    pattern.game,
    pattern.plain,
    'the full-bleed dotted layer must be untouched, so the sides match other strips'
  );
  assert.ok(
    pattern.scrim !== 'rgba(0, 0, 0, 0)' && pattern.scrim !== 'transparent',
    'the game column carries a scrim to lighten its own dots, got ' + pattern.scrim
  );
  console.log('dots    : bleed matches plain strips; column scrim ' + pattern.scrim);

  // --- the idle prompt must always be there, however many times you have played ---
  // (back to a desktop width first: the earlier layout loop left it at 390px, where
  // the prompt correctly reads "tap to start" instead.)
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => localStorage.setItem('dino-played', '1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.dino-root')?.dinoGame?.spriteImage, null, { timeout: 15000 });
  // The prompt is painted on the canvas so it carries the same weight as the
  // GAME OVER banner, so check the pixels rather than the DOM. The DOM copy is
  // kept screen-reader only, and is checked separately below.
  // Counts painted pixels in the banner slot only: a narrow box around the centre
  // of the playfield. Clouds and cacti drift through that height, so the caller
  // clears the field before sampling mid-game.
  const promptPixels = () => page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    const cv = document.querySelector('.dino-canvas');
    const ctx = cv.getContext('2d');
    const dpr = cv.width / cv.getBoundingClientRect().width;
    const px = u => u * g.scale * dpr;
    const x = Math.round(px(g.worldWidth / 2 - 120));
    const y = Math.round(px(75 - 11 / 2 - 14 - 8));
    const data = ctx.getImageData(x, Math.max(0, y), Math.round(px(240)), Math.round(px(20))).data;
    let ink = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 40) ink++;
    return ink;
  });
  const idleInk = await promptPixels();
  assert.ok(idleInk > 200, 'the idle prompt is drawn on the canvas, ink=' + idleInk);
  const idleText = await page.evaluate(() => document.querySelector('.dino-hint').innerText.trim());
  assert.match(idleText, /spacebar to start/, 'screen readers are told how to start');
  console.log('prompt  : drawn on canvas (' + idleInk + ' px), a11y text "' + idleText + '"');

  // It must use the sprite's own lettering, not a web font: same 11px cell height
  // as the GAME OVER wordmark, and wording that shrinks to fit a narrow playfield.
  const font = await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    const key = Object.keys(g.textCache || {})[0];
    return { text: key, height: g.textCache?.[key]?.height, width: g.textCache?.[key]?.width };
  });
  assert.equal(font.height, 11, 'the prompt is drawn in the 11px pixel font');
  assert.equal(font.text, 'PRESS SPACEBAR TO START', 'full wording at desktop width');
  console.log('prompt  : pixel font, "' + font.text + '" ' + font.width + 'u x ' + font.height + 'px');

  for (const [width, expected] of [[1280, 'PRESS SPACEBAR TO START'], [480, 'PRESS SPACE']]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(350);
    const picked = await page.evaluate(() => {
      const g = document.querySelector('.dino-root').dinoGame;
      g.textCache = {};
      g.draw();
      return Object.keys(g.textCache)[0];
    });
    assert.equal(picked, expected, `wording at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  console.log('prompt  : wording shortens to fit narrow playfields');

  // --- sounds are decoded before any input, so the very first jump is not silent ---
  await page.waitForFunction(
    () => Object.keys(document.querySelector('.dino-root').dinoGame.sounds).length === 3,
    null,
    { timeout: 15000 }
  );
  await page.evaluate(() => { window.__played = []; });
  await page.locator('.dino-canvas').click({ position: { x: 400, y: 60 } });
  await page.waitForTimeout(400);
  assert.ok(
    await page.evaluate(() => window.__played.length) > 0,
    'the first jump plays a sound (sounds must be preloaded, not fetched on the gesture)'
  );
  console.log('sound   : preloaded, first jump audible');

  // Once playing, that banner slot must be clear again. Empty the field first so
  // a passing cloud or cactus cannot be mistaken for the prompt.
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.obstacles = [];
    g.clouds = [];
    g.draw();
  });
  const playingInk = await promptPixels();
  assert.ok(playingInk < idleInk / 2, 'the prompt clears once the game starts, ink=' + playingInk);
  console.log('prompt  : cleared while playing (' + playingInk + ' px)');
  await page.evaluate(() => { window.__played = []; });
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.obstacles = []; g.trex.jumping = false; g.startJump();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.distanceRan = 199 / 0.025; g.updateMeter(16, 200);
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.dino-root').dinoGame.gameOver());
  await page.waitForTimeout(300);
  const fired = await page.evaluate(() => window.__played);
  assert.equal(fired.length, 3, 'jump, milestone and crash each play a sound, got ' + fired.length);
  console.log('sound   : ' + fired.length + ' played, durations ' + fired.join('s, ') + 's');

  const crashed = await page.evaluate(() => document.querySelector('.dino-hint').innerText.trim());
  assert.match(crashed, /play again/, 'screen readers are told how to restart');
  const crashInk = await promptPixels();
  assert.ok(crashInk > 200, 'the GAME OVER banner fills the same slot, ink=' + crashInk);
  console.log('prompt  : GAME OVER in the same slot (' + crashInk + ' px), a11y text "' + crashed + '"');

  // --- mute silences the game and is remembered ---
  await page.locator('.dino-mute').click();
  await page.evaluate(() => { window.__played = []; });
  await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.restart(); g.trex.jumping = false; g.startJump();
  });
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__played.length), 0, 'mute silences the game');
  assert.equal(await page.evaluate(() => localStorage.getItem('dino-muted')), '1', 'mute is remembered');
  console.log('sound   : mute silences the game and persists');

  // --- the game speeds up, and flips the theme every 200 points ---
  const ramp = await page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    g.play();
    g.stopLoop();
    g.currentSpeed = 6;
    g.distanceRan = 0;
    g.obstacles = [];
    g.trex.yPos = -500;
    g.lastInvertMilestone = 0;
    const flips = [];
    let was = g.inverted;
    const speeds = [];
    for (let f = 1; f <= 60 * 70; f++) {
      g.update(1000 / 60);
      g.obstacles = [];
      if (g.inverted !== was) {
        was = g.inverted;
        flips.push(Math.round(g.distanceRan * 0.025));
      }
      if (f % (60 * 15) === 0) speeds.push(+g.currentSpeed.toFixed(1));
    }
    g.startLoop();
    return { flips, speeds };
  });
  assert.ok(
    ramp.speeds[0] > 6.5 && ramp.speeds[ramp.speeds.length - 1] > ramp.speeds[0],
    'the game accelerates, speeds: ' + ramp.speeds.join(', ')
  );
  const gaps = ramp.flips.slice(1).map((v, i) => v - ramp.flips[i]);
  assert.ok(gaps.length >= 3, 'the theme flips repeatedly, got ' + ramp.flips.join(', '));
  assert.ok(
    gaps.every(g => g >= 195 && g <= 215),
    'each theme flip is ~200 points apart, gaps: ' + gaps.join(', ')
  );
  console.log('speed   : ' + ramp.speeds.join(' -> ') + ' over 70s');
  console.log('theme   : flips at ' + ramp.flips.join(', '));

  // --- WASD is opt-in, and never displaces the arrows or spacebar ---
  // The acceleration test above leaves the game at MAX_SPEED, which spawns
  // obstacles faster than these key presses can be measured. Wind the speed
  // back so each control is checked on its own, not against a crash.
  const settle = () => page.evaluate(() => {
    const g = document.querySelector('.dino-root').dinoGame;
    // The game keeps running between checks, so an obstacle can end it in the
    // gaps; start a fresh run rather than measuring controls on a game-over screen.
    if (g.crashed) g.restart();
    if (!g.playing) g.play();
    g.currentSpeed = 6;
    g.obstacles = [];
    g.trex.jumping = false;
    g.trex.ducking = false;
    g.trex.speedDrop = false;
    g.trex.yPos = g.trex.groundYPos;
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await settle();
  await page.locator('.dino-canvas').focus();
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(180);
  const offDuck = await page.evaluate(() => document.querySelector('.dino-root').dinoGame.trex.ducking);
  await page.keyboard.up('KeyS');
  assert.equal(offDuck, false, 'S does nothing until WASD is switched on');

  await page.locator('.dino-keys').click();
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.dino-keys').getAttribute('aria-pressed'), 'true');
  await settle();
  await page.keyboard.down('KeyS');
  await page.waitForTimeout(200);
  const onDuck = await page.evaluate(() => document.querySelector('.dino-root').dinoGame.trex.ducking);
  await page.keyboard.up('KeyS');
  await page.waitForTimeout(150);
  const stood = await page.evaluate(() => document.querySelector('.dino-root').dinoGame.trex.ducking);
  assert.ok(onDuck && !stood, 'S ducks while held and stands on release');

  for (const key of ['KeyW', 'ArrowUp', 'Space']) {
    await settle();
    await page.keyboard.press(key);
    await page.waitForTimeout(100);
    assert.ok(
      await page.evaluate(() => document.querySelector('.dino-root').dinoGame.trex.jumping),
      key + ' jumps with WASD enabled'
    );
  }
  assert.equal(await page.evaluate(() => localStorage.getItem('dino-wasd')), '1', 'WASD choice is remembered');
  console.log('controls: WASD opt-in works, arrows and spacebar unaffected');

  // --- the controls sit in their own row, clear of the playfield and the ground ---
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(400);
  const layout = await page.evaluate(() => {
    const box = el => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom) };
    };
    return {
      canvas: box(document.querySelector('.dino-canvas')),
      controls: box(document.querySelector('.dino-controls')),
      strip: box(document.querySelector('.dino-strip')),
    };
  });
  assert.ok(
    layout.controls.top >= layout.canvas.bottom,
    'controls must sit below the playfield, not on top of the ground line'
  );
  assert.ok(
    layout.controls.bottom <= layout.strip.bottom + 1,
    'controls stay inside the strip'
  );
  console.log(
    'controls: canvas ends ' + layout.canvas.bottom +
    ', controls ' + layout.controls.top + '-' + layout.controls.bottom + ' (own row)'
  );

  // --- WASD is pointless without a keyboard, so it is hidden on phones ---
  for (const [width, expected] of [[390, 'none'], [1280, 'flex']]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    const shown = await page.evaluate(
      () => getComputedStyle(document.querySelector('.dino-keys')).display
    );
    assert.equal(shown, expected, `WASD toggle display at ${width}px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log('controls: WASD hidden on phones, shown from 640px');

  assert.deepEqual(errors, [], 'no page errors');
  console.log('PASS: dino game renders, plays, scores, flips the site theme at night, and keeps a high score.');
} finally {
  await browser.close();
}
