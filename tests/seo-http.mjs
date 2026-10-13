import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const base = process.env.SITE_URL || 'http://127.0.0.1:4324';
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
let checks = 0;
try {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const content = await (await context.request.get((process.env.CMS_URL || 'http://127.0.0.1:1337') + '/api/portfolio')).json();
  const routes = [['/', 'ProfilePage'], ['/about', 'ProfilePage'], ['/articles', 'CollectionPage']];
  const article = content.articles.find(item => item.contentKind !== 'personal');
  if (article) routes.push(['/articles/' + article.slug, 'BlogPosting']);
  if (content.projects[0]) routes.push(['/projects/' + content.projects[0].slug, 'CreativeWork']);
  // SEO must exist in server-rendered HTML without hydration, animations or JS.
  for (const [path, type] of routes) {
    const response = await page.goto(base + path, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(),200,path);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://s4meer.com' + path);
    assert.equal(await page.locator('h1').count(),1,`${path}: one main heading`);
    const graph=JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
    assert.ok(graph.some(node=>node['@type']===type),`${path}: ${type}`);
    assert.equal(graph.find(node=>node['@type']==='Person').name,'Sameer Chauhan');
    assert.equal(graph.find(node=>node['@type']==='Person').url,'https://s4meer.com/');
    assert.equal(await page.locator('meta[name="robots"]').count(),1);
    if(path!=='/') assert.equal(await page.locator('nav[aria-label="Breadcrumb"]').count(),1);
    checks++;
  }
  const get=async(path, options={})=>context.request.get(base+path,{maxRedirects:0,...options});
  const sitemap=await get('/sitemap.xml');assert.equal(sitemap.status(),200);
  const urls=[...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
  assert.ok(urls.length>10);assert.ok(urls.every(url=>url.startsWith('https://s4meer.com/')));
  assert.ok(!urls.some(url=>url.endsWith('/articles/1')));
  for(const url of urls){const r=await get(new URL(url).pathname);assert.equal(r.status(),200,`sitemap URL ${url}`);}checks++;
  const robot=await (await get('/robots.txt')).text();assert.match(robot,/OAI-SearchBot/);assert.match(robot,/Sitemap: https:\/\/s4meer.com\/sitemap-index.xml/);checks++;
  for(const path of ['/llms.txt','/index.md']) { const r=await get(path);assert.equal(r.status(),200);const text=await r.text();assert.match(text,/s4meer.com/);assert.ok(!text.includes('127.0.0.1'));assert.ok(!text.includes('[undefined]'));checks++; }
  for(const [path,target] of [['/articles/1','/articles'],['/articles/01','/articles'],['/articles/2/','/articles/2']]) {
    const r=await get(path+'?ref=test');assert.equal(r.status(),308);assert.equal(r.headers().location,target+'?ref=test');checks++;
  }
  const alias=await get('/articles/dsa?ref=domain',{headers:{Host:'sameerchauhan.com'}});
  assert.equal(alias.status(),308);assert.equal(alias.headers().location,'https://s4meer.com/articles/dsa?ref=domain');checks++;
  const primary=await get('/',{headers:{Host:'s4meer.com'}});assert.equal(primary.status(),200);assert.ok(!primary.headers()['x-robots-tag']);checks++;
  const preview=await get('/');assert.match(preview.headers()['x-robots-tag'],/noindex/);checks++;
  const missing=await get('/articles/this-does-not-exist',{headers:{Host:'s4meer.com'}});assert.equal(missing.status(),404);assert.match(missing.headers()['x-robots-tag'],/noindex/);checks++;
  console.log(`PASS: ${checks} server-rendered SEO, crawl, canonical, heading, domain and redirect checks; ${urls.length} sitemap destinations return 200.`);
} finally { await browser.close(); }
