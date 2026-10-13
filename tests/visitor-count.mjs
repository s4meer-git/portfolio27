import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({headless:true,channel:'chrome'});
const ready = page => page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-loading'));
try {
 const page = await browser.newPage();const requests=[];const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(request.url().endsWith('/api/visitors'))requests.push(request.postDataJSON());});
 await page.goto(site,{waitUntil:'networkidle'});await ready(page);
 const number=async()=>Number((await page.locator('visitor-count').textContent()).replace(/[^0-9]/g,''));
 const first=await number();assert.ok(first>=2789);assert.match(await page.locator('visitor-count').textContent(),/total visits/);
 assert.equal(requests.length,1);
 const visitId=requests[0].visitId;
 const retry=await page.request.post(site+'/api/visitors',{data:{visitId}});
 assert.equal(retry.status(),200);assert.equal((await retry.json()).totalVisits,first,'same request id does not add a visit');
 await page.locator('a[href="/about"]').first().click();await ready(page);
 assert.equal(await number(),first);assert.equal(requests.length,1,'client navigation does not count footer re-renders');
 await page.reload({waitUntil:'networkidle'});await ready(page);
 assert.ok(await number()>first,'full reload increases total visits');
 assert.notEqual(requests.at(-1).visitId,visitId);
 assert.deepEqual(errors,[]);
 const failed=await browser.newPage();let attempts=0;let firstRecorded;const ids=[];
 await failed.route('**/api/visitors',async route=>{
  ids.push(route.request().postDataJSON().visitId);attempts++;
  if(attempts===1){const recorded=await route.fetch();firstRecorded=(await recorded.json()).totalVisits;await route.fulfill({status:503,json:{error:'Simulated lost response'}});}
  else await route.continue();
 });
 await failed.goto(site,{waitUntil:'networkidle'});
 await failed.waitForFunction(()=>document.querySelector('visitor-count')?.textContent==='Thanks for visiting');
 await failed.locator('visitor-count').evaluate(element=>{const parent=element.parentNode;element.remove();parent.append(element);});
 await failed.waitForFunction(()=>document.querySelector('visitor-count')?.textContent.includes('total visits'));
 assert.equal(ids.length,2);assert.equal(ids[0],ids[1]);
 assert.equal(Number((await failed.locator('visitor-count').textContent()).replace(/[^0-9]/g,'')),firstRecorded,'retry after a lost response keeps the same visit count');
 const invalid=await page.request.post(site+'/api/visitors',{data:{visitId:'invalid'}});assert.equal(invalid.status(),400);
 console.log('PASS: reload increments total visits, page-navigation deduplication, retry after a lost response, invalid-id rejection and no browser errors.');
} finally {await browser.close();}
