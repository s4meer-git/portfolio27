import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { blockquoteMarkdown, blockquotePositions, insertBlockquote } from '../cms/src/admin/blockquote-markdown.mjs';

const body = 'Opening hook.\n\n## First section\n\nAsha tries again.\n\n```python\n# This is code, not a section\n```\n\n## Second section\n\nKeep this paragraph.';
const positions = blockquotePositions(body);
assert.equal(positions.length,4,'code headings are not insertion targets');
const quote = blockquoteMarkdown({ text:'What should Asha check?', variant:'solid', align:'end', author:'Sameer [author]', source:'https://s4meer.com/about' });
const inserted = insertBlockquote(body,quote,positions[2].value);
assert.ok(inserted.indexOf(quote) < inserted.indexOf('## Second section'));
assert.equal(inserted.replace('\n\n'+quote,''),body,'insertion preserves existing content');
assert.throws(()=>blockquoteMarkdown({text:'Question?',source:'javascript:alert(1)'}),/http/);
assert.throws(()=>insertBlockquote(body,quote,'section-missing'),/sections changed/);

const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const { credentials: credentials } = await import('./helpers/cms-credentials.mjs');
const login = await fetch(cms+'/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials)});
assert.ok(login.ok); const token = (await login.json()).data.token;
async function api(path,method='GET',data) {
  const response = await fetch(cms+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(data ? {body:JSON.stringify(data)} : {})});
  assert.ok(response.ok,`${method} ${path}: ${response.status}`);
  return response.status===204 ? null : response.json();
}
const endpoint='/content-manager/collection-types/api::article.article';
const before=(await api('/api/portfolio')).articles;
const slug='blockquote-authoring-check-'+Date.now();
let id, browser, page;
try {
  const record=(await api(endpoint,'POST',{title:'Temporary blockquote authoring check',slug,body,contentKind:'technical',pubDatetime:'2026-07-11T00:00:00.000Z'})).data;
  id=record.documentId;
  browser=await chromium.launch({headless:true,channel:'chrome'});
  page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  // Reuse this test's API login in an isolated browser context. Avoid a second
  // login that would exhaust Strapi's legitimate admin login rate limit.
  await page.addInitScript(token => localStorage.setItem('jwtToken',JSON.stringify(token)),token);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${cms}/admin/content-manager/collection-types/api::article.article/${id}?status=draft`);
  await page.getByRole('button',{name:'Insert blockquote',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('textbox',{name:'Question text',exact:true}).fill('What should Asha check before retrying?');
  await dialog.getByRole('combobox',{name:'Style',exact:true}).click();await page.getByRole('option',{name:'Solid',exact:true}).click();
  await dialog.getByRole('combobox',{name:'Alignment',exact:true}).click();await page.getByRole('option',{name:'Right',exact:true}).click();
  await dialog.getByRole('textbox',{name:'Attribution (optional)',exact:true}).fill('Sameer Chauhan');
  await dialog.getByRole('textbox',{name:'Source URL (optional)',exact:true}).fill('javascript:alert(1)');
  await dialog.getByRole('button',{name:'Insert into article',exact:true}).click();assert.match(await dialog.getByRole('alert').innerText(),/http/);
  await dialog.getByRole('textbox',{name:'Source URL (optional)',exact:true}).fill('https://s4meer.com/about');
  await dialog.getByRole('combobox',{name:'Placement',exact:true}).click();await page.getByRole('option',{name:'After section: First section',exact:true}).click();
  await page.screenshot({path:'/tmp/cms-blockquote-composer.png'});
  await dialog.getByRole('button',{name:'Insert into article',exact:true}).click();await dialog.waitFor({state:'hidden'});
  const saveResponse=page.waitForResponse(response=>response.request().method()==='PUT' && response.url().includes(id));
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await saveResponse;
  const saved=(await api(`${endpoint}/${id}`)).data;
  assert.ok(saved.body.includes('[!QUESTION style=solid align=end]'));
  assert.ok(saved.body.indexOf('What should Asha check')<saved.body.indexOf('## Second section'));
  assert.ok(saved.body.includes('[!CITE] [Sameer Chauhan](<https://s4meer.com/about>)'));
  assert.ok(!saved.publishedAt,'composer saves only the draft');
  await api(`${endpoint}/${id}/actions/publish`,'POST');
  await page.goto(`${cms}/admin/content-manager/collection-types/api::article.article/${id}?status=published`);
  await page.getByRole('button',{name:'Insert blockquote',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Insert blockquote',exact:true}).isDisabled(),true,'published content stays read-only');
  if(process.env.CMS_ONLY==='1') {
    assert.ok((await api('/api/portfolio')).articles.some(article=>article.slug===slug && article.body===saved.body));
    assert.deepEqual(errors,[]);
    console.log('PASS: production CMS panel, preview, section insertion, draft save and publish.');
  } else {
  await page.goto(`${site}/articles/${slug}`);
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-loading'));
  const rendered=page.locator('blockquote.article-question');
  assert.equal(await rendered.getAttribute('data-variant'),'solid');
  assert.equal(await rendered.evaluate(el=>getComputedStyle(el).textAlign),'end');
  assert.equal(await rendered.locator('footer a').getAttribute('href'),'https://s4meer.com/about');
  assert.ok(!(await rendered.innerText()).includes('[!'));
  await rendered.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/blockquote-authoring-site.png'});
  assert.deepEqual(errors,[]);
  console.log('PASS: CMS insertion, section placement, preview, unsafe URL rejection, draft save, attribution and published rendering.');
  }
} catch (error) {
  if(page){await page.screenshot({path:'/tmp/cms-blockquote-failure.png'});console.error((await page.locator('body').innerText()).slice(0,2500));}
  throw error;
} finally {
  await browser?.close();
  if(id)await api(`${endpoint}/${id}`,'DELETE');
  assert.deepEqual((await api('/api/portfolio')).articles,before,'existing published articles remain unchanged');
}
