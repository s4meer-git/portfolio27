import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, webkit } from '@playwright/test';
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const {api}=await import('./helpers/cms-client.mjs');
const before=await api('/api/portfolio');
async function refreshTestSite() {
 // A second local server is not the CMS webhook's configured target.
 if (!process.env.SITE_URL) return;
 const response=await fetch(site+'/api/revalidate',{method:'POST',headers:{Origin:new URL(site).origin,'Content-Type':'application/json',...(process.env.REVALIDATE_SECRET?{'x-revalidate-secret':process.env.REVALIDATE_SECRET}:{})}});
 assert.ok(response.ok,`test-site revalidation: ${response.status}`);
}
const baseline=before.articles.map(a=>({slug:a.slug,body:a.body,pubDatetime:a.pubDatetime}));
const endpoint='/content-manager/collection-types/api::article.article';
const created=[];
const run=Date.now();
const slug=`article-ui-check-${run}`;
const personalSlug=`journal-ui-check-${run}`;
const image=before.articles.find(a=>a.image)?.image;
const technical={title:'Temporary technical article UI check',slug,contentKind:'technical',pubDatetime:new Date().toISOString(),description:'Temporary interaction verification.',body:`Opening hook.\n\n## A useful question\n\n> [!QUESTION]\n> **_What should happen when the same message arrives twice?_**\n\nHere is the first image beside its explanation.\n\n![First diagram](${image.url})\n\n## A different explanation\n\nHere is a later passage with a different image position.\n\n![Second diagram](${image.url})\n\n\`\`\`python\nname = "Asha"\nprint(name)\n\`\`\``,exercise:{question:'Asha retries the same request. What must stay the same?',answer:'Reuse the request ID.\n\n```python\nrequest_id = "order-101"\n```'}};
technical.attachments=[{image:image.id,alt:'CMS image description',caption:'CMS caption beside the relevant image'}];
technical.body+='\n\n> [!QUOTE style=solid align=end]\n> Asha keeps the request ID.\n>\n> [!CITE] [Sameer Chauhan](https://s4meer.com/about)\n\n> [!QUESTION style=plain align=start]\n> Could the reply have been lost?\n\n> A normal Markdown quotation stays unchanged.';
try {
 for(const payload of [technical,{title:'Temporary personal journal UI check',slug:personalSlug,contentKind:'personal',pubDatetime:'2026-07-19T14:50:24.989Z',body:'I almost turned back.\n\nA personal reflection, with no code or quiz.'}]) {
  const record=(await api(endpoint,'POST',payload)).data;created.push(record.documentId);
  await api(`${endpoint}/${record.documentId}/actions/publish`,'POST');
 }
 await refreshTestSite();
 assert.equal((await fetch(site+'/articles/'+personalSlug)).status,404,'personal stories have no technical article route');
 assert.equal((await fetch(site+'/journal/'+slug)).status,404,'technical stories have no journal route');
 const listing=await (await fetch(site+'/articles')).text();
 assert.ok(!listing.match(/<main[\s\S]*?<\/main>/)?.[0].includes(personalSlug));
 const journal=await(await fetch(site+'/journal')).text();assert.ok(journal.includes('/journal/'+personalSlug));
 const sitemap=await(await fetch(site+'/sitemap.xml')).text();
 assert.ok(sitemap.includes('/journal/'+personalSlug));assert.ok(!sitemap.includes('/articles/'+personalSlug));
 const llms=await(await fetch(site+'/llms.txt')).text();assert.ok(llms.includes('/journal/'+personalSlug));
 for(const engine of [chromium,webkit]) {
  const browser=await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});
  try {
   const context=await browser.newContext({viewport:engine===webkit?{width:375,height:812}:{width:1280,height:900},reducedMotion:'reduce'});
   await context.route('**/api/spotify',route=>route.fulfill({json:{status:'unavailable'}}));
   await context.addInitScript(()=>{
    window.__copied=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copied.push(text)}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data;}});
   });
   const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(`${site}/articles/${slug}`);await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-loading'));
   assert.equal(await page.locator('main h1').count(),1);
   assert.equal(await page.locator('article img').count(),2);
   assert.equal(await page.locator('article figure figcaption').first().textContent(),'CMS caption beside the relevant image');
   assert.equal(Number(await page.locator('article img').first().getAttribute('width')),image.width);
   assert.equal(await page.locator('.article-original-images').count(),0,'no automatic attachment gallery');
   assert.equal(await page.locator('blockquote.article-question').count(),2);
   const quote=page.locator('blockquote.article-question').first();
   assert.equal(await quote.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
   assert.equal(await quote.evaluate(el=>getComputedStyle(el).borderLeftWidth),'0px');
   assert.equal(await quote.locator('svg').evaluate(el=>getComputedStyle(el).position),'static');
   const questionFont = await quote.locator('p').evaluate(el=>getComputedStyle(el).fontSize);
   if (Number.parseFloat(questionFont)<18) { await quote.scrollIntoViewIfNeeded(); await page.screenshot({path:'/tmp/article-question-font-failure.png'}); }
   assert.ok(Number.parseFloat(questionFont)>=18,`question font: ${questionFont}`);
   assert.equal(await quote.evaluate(el=>getComputedStyle(el).textAlign),'center');
   const plain=page.locator('blockquote[data-variant="plain"][data-align="start"]');
   assert.equal(await plain.evaluate(el=>getComputedStyle(el).borderLeftWidth),'0px');
   assert.equal(await plain.evaluate(el=>getComputedStyle(el).textAlign),'start');
   const solid=page.locator('blockquote[data-variant="solid"]');
   assert.equal(await solid.evaluate(el=>getComputedStyle(el).textAlign),'end');
   assert.equal(await solid.locator('footer a').getAttribute('href'),'https://s4meer.com/about');
   assert.equal(await page.locator('blockquote:not(.article-blockquote) svg').count(),0);
   assert.ok(!(await solid.innerText()).includes('[!CITE]'));
   await quote.scrollIntoViewIfNeeded();await page.screenshot({path:engine===webkit?'/tmp/article-question-mobile.png':'/tmp/article-question-desktop.png'});
   const reveal=page.locator('[data-reveal]');await reveal.click();const dialog=page.locator('dialog.article-answer-dialog');
   assert.equal(await dialog.evaluate(el=>el.open),true);assert.match(await dialog.innerText(),/order-101/);
   assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth));
   await page.screenshot({path:engine===webkit?'/tmp/article-answer-mobile.png':'/tmp/article-answer-desktop.png'});
   await page.keyboard.press('Escape');assert.equal(await dialog.evaluate(el=>el.open),false);await page.waitForFunction(()=>document.querySelector('[data-reveal]')===document.activeElement);
   await reveal.click();await dialog.locator('button').first().click();assert.equal(await dialog.evaluate(el=>el.open),false);
   await page.locator('[data-copy-link]').click();assert.equal(await page.evaluate(()=>window.__copied.at(-1)),`https://s4meer.com/articles/${slug}`);
   assert.equal(await page.locator('[data-share-status]').innerText(),before.site.articleLabels.copiedLinkLabel);
   await page.locator('[data-share-native]').click();assert.equal((await page.evaluate(()=>window.__shared)).url,`https://s4meer.com/articles/${slug}`);
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}}}));
   await page.locator('[data-copy-link]').click();assert.equal(await page.locator('[data-share-url]').isVisible(),true);
   await page.evaluate(()=>document.documentElement.classList.add('dark'));await quote.scrollIntoViewIfNeeded();
   await page.screenshot({path:engine===webkit?'/tmp/article-question-mobile-dark.png':'/tmp/article-question-desktop-dark.png'});
   await page.goto(`${site}/journal/${personalSlug}`);assert.equal(await page.locator('[data-reveal]').count(),0);assert.equal(await page.locator('article pre').count(),0);
   await page.goto(site+'/articles');await page.locator(`a[href="/articles/${slug}"]`).first().click();await page.waitForSelector('[data-reveal]');await page.locator('[data-reveal]').click();
   assert.equal(await page.locator('dialog.article-answer-dialog').evaluate(el=>el.open),true);assert.equal(await page.locator('[data-article-progress]').count(),1);
   assert.deepEqual(errors,[]);console.log(`PASS ${engine.name()}: question quote, inline image placement, popup/focus, copy/share/fallback, mobile/dark and navigation.`);
  } finally {await browser.close();}
 }
 // Change only our temporary article to prove the question and answer are CMS content.
 const updated={...technical,exercise:{question:'CMS edited question',answer:'CMS edited solution'}};
 await api(`${endpoint}/${created[0]}`,'PUT',updated);await api(`${endpoint}/${created[0]}/actions/publish`,'POST');await refreshTestSite();
 const edited=await(await fetch(`${site}/articles/${slug}`)).text();assert.ok(edited.includes('CMS edited question')&&edited.includes('CMS edited solution'));
 console.log('PASS: CMS edits update the question/solution; journal entries stay separate in routes, listings and SEO discovery.');
} finally {
 for(const id of created.reverse()) await api(`${endpoint}/${id}`,'DELETE');
 await refreshTestSite();
 const after=await api('/api/portfolio');
 assert.deepEqual(after.articles.map(a=>({slug:a.slug,body:a.body,pubDatetime:a.pubDatetime})),baseline,'existing published articles are unchanged');
}
