import { chromium } from '@playwright/test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage();
// A fresh admin account gets a guided tour and a promo banner; both sit over the page
// and swallow clicks, so dismiss whatever is present before driving the UI.
const dismissOverlays=()=>page.evaluate(()=>{
  for(const b of document.querySelectorAll('button')){
    const text=(b.innerText||'').trim();
    const label=b.getAttribute('aria-label')||'';
    if(/^(Skip|Skip the tour)$/i.test(text)||/close the banner/i.test(label)) b.click();
  }
});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:1337/admin');
  const { credentials: credentials } = await import('./helpers/cms-credentials.mjs');
  await page.getByRole('textbox',{name:'Email',exact:false}).fill(credentials.email);
  await page.locator('input[name=password]').fill(credentials.password);
  await page.getByRole('button',{name:'Login',exact:true}).click();
  await page.waitForTimeout(2500);
  await dismissOverlays();
  assert.ok((await page.locator('body').innerText()).includes('Hello Portfolio'));
  await page.goto('http://127.0.0.1:1337/admin/content-manager');
  await page.waitForTimeout(1800);
  await dismissOverlays();
  assert.ok((await page.locator('body').innerText()).includes('Website settings'));
  await page.getByRole('link', {name:'Website settings',exact:true}).click();
  await page.waitForTimeout(2500);
  await dismissOverlays();
  const settings = await page.locator('body').innerText();
  for (const label of ['Links','Navigation bar','Skills','Home page headings',
                       'Articles wording','Projects wording','Button wording',
                       'Footer','Search & sharing','Articles per page']) {
    assert.ok(settings.includes(label), `Website settings shows the "${label}" section`);
  }
  await page.screenshot({path:'/tmp/portfolio-cms-admin.png',fullPage:true});
  const { site } = await (await fetch('http://127.0.0.1:1337/api/portfolio')).json();
  await page.goto('http://127.0.0.1:4321/');
  const home = await page.locator('body').innerText();
  assert.ok(home.includes(site.profile.displayName), 'Home page shows the name set in the CMS');
  assert.ok(home.includes(site.sectionLabels.skills), 'Home page shows the Skills heading from the CMS');
  await page.screenshot({path:'/tmp/portfolio-cms-home.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: admin login, content manager, grouped Website settings editor, portfolio rendering; no browser errors.');
} finally { await browser.close(); }
