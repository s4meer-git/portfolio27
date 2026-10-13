import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const output = process.env.PORTRAIT_REPORT || '/tmp/portrait-performance.json';
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const requests = new Map();
  cdp.on('Network.responseReceived', ({ requestId, response, type }) => {
    if (type === 'Image') requests.set(requestId, { url: response.url, bytes: 0 });
  });
  cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
    if (requests.has(requestId)) requests.get(requestId).bytes = encodedDataLength;
  });
  await page.goto(process.env.SITE_URL || 'http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.documentElement.hasAttribute('data-page-loading'), null, { timeout: 30000 });
  await page.waitForTimeout(2000);
  if (process.env.ISOLATE_PORTRAIT) {
    await page.evaluate(() => {
      const root = document.querySelector('portrait-switch');
      const stage = document.createElement('div');
      stage.style.cssText = 'padding:80px; width:400px;';
      root.remove();
      document.body.replaceChildren(stage);
      stage.append(root);
    });
    await page.waitForTimeout(500);
  }
  const images = await page.locator('.portrait-layer img').evaluateAll(imgs => imgs.map(img => ({
    src: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight,
    loading: img.loading, fetchPriority: img.fetchPriority,
    visible: getComputedStyle(img).display !== 'none' && getComputedStyle(img.parentElement).opacity !== '0',
  })));
  const initialRequests = [...requests.values()].filter(r => images.some(img => img.src === r.url) || /\/portraits\//.test(r.url));
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const samples = [];
  for (let i = 0; i < 6; i++) {
    const before = await metrics();
    const sample = await page.evaluate(async (switchIt) => {
      const root = document.querySelector('portrait-switch');
      const intervals = [];
      const longTasks = [];
      const shifts = [];
      const start = performance.now();
      let last = start;
      const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(e => e.duration)));
      observer.observe({ type: 'longtask' });
      const shiftObserver = new PerformanceObserver(list => shifts.push(...list.getEntries().map(e => e.value)));
      shiftObserver.observe({ type: 'layout-shift' });
      if (switchIt) root.querySelector('.portrait-photo-trigger').click();
      await new Promise(resolve => {
        const tick = now => {
          intervals.push(now - last);
          last = now;
          if (now - start < 2500) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      observer.disconnect();
      shiftObserver.disconnect();
      const sorted = intervals.slice(1).sort((a,b) => a-b);
      return {
        kind: switchIt ? 'switch' : 'idle', frames: sorted.length,
        p95FrameMs: sorted[Math.floor(sorted.length * .95)], maxFrameMs: Math.max(...sorted),
        framesOver34ms: sorted.filter(n => n > 34).length,
        longTasks, layoutShift: shifts.reduce((a,b) => a+b,0),
        unfinished: root.hasAttribute('data-transforming'),
        activeAnimations: root.getAnimations({ subtree: true }).filter(a => a.playState === 'running').length,
      };
    }, i !== 0);
    const after = await metrics();
    sample.mainThreadMs = (after.TaskDuration - before.TaskDuration) * 1000;
    sample.scriptMs = (after.ScriptDuration - before.ScriptDuration) * 1000;
    sample.layoutMs = (after.LayoutDuration - before.LayoutDuration) * 1000;
    sample.styleMs = (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000;
    samples.push(sample);
  }
  const report = { browser: browser.version(), cpuThrottle: 4, viewport: '1280x900 @2x', images, initialRequests, initialImageBytes: initialRequests.reduce((sum,r) => sum+r.bytes,0), samples };
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
