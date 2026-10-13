import assert from 'node:assert/strict';
import {chromium,webkit} from '@playwright/test';
import {renderArticleDiagram} from '../src/lib/article-diagram.ts';
const site=process.env.SITE_URL||'http://127.0.0.1:4325';
const data=await fetch('http://127.0.0.1:1337/api/portfolio').then(r=>r.json());
const articles=data.articles.filter(a=>a.body.includes('```diagram'));
assert.ok(articles.length>=4);
const hostile=renderArticleDiagram(JSON.stringify({title:'<script>bad()</script>',rows:[[{id:'a',text:'<img src=x onerror=bad()>'}]],caption:'<b>plain text</b>'}));
assert.ok(hostile&&!hostile.includes('<script>')&&!hostile.includes('<img '));
assert.ok(hostile.includes('&lt;script&gt;'));
assert.equal(renderArticleDiagram('{broken'),undefined);
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true,...(engine===chromium?{channel:'chrome'}:{})});
 try{
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});
  await context.route('**/api/visitors',r=>r.fulfill({json:{count:0}}));
  await context.route('**/api/spotify',r=>r.fulfill({json:{status:'unavailable'}}));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const article of articles){
   await page.goto(site+'/articles/'+article.slug);
   await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-loading'));
   const expected=[...article.body.matchAll(/```diagram\n([\s\S]*?)```/g)].map(m=>JSON.parse(m[1]));
   assert.equal(await page.locator('.article-diagram').count(),expected.length,article.slug);
   assert.equal(await page.locator('pre code.language-diagram').count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow: '+article.slug);
   for(const [i,diagram] of expected.entries()){
    const figure=page.locator('.article-diagram').nth(i);
    const visibleSvg=figure.locator('svg:visible');
    assert.equal(await visibleSvg.count(),1);
    assert.equal(await visibleSvg.locator('.diagram-node').count(),diagram.rows.flat().length);
    assert.equal(await visibleSvg.getAttribute('aria-label'),diagram.title);
    assert.ok(await visibleSvg.locator('title').textContent());
    assert.ok(await figure.locator('figcaption').textContent());
    for(const mode of ['light','dark']){
     await page.evaluate(mode=>document.documentElement.classList.toggle('dark',mode==='dark'),mode);
     const sizes=await visibleSvg.locator('.diagram-node-label').evaluateAll(nodes=>nodes.map(n=>({size:parseFloat(getComputedStyle(n).fontSize),fill:getComputedStyle(n).fill})));
     assert.ok(sizes.every(n=>n.size>=14&&n.fill!=='none'));
     await figure.screenshot({path:`/tmp/diagram-${article.seriesOrder}-${engine.name()}-${mode}.png`});
    }
   }
  }
  assert.deepEqual(errors,[]);await context.close();
  console.log(`${engine.name()}: ${articles.length} CMS-authored diagrams render with labels, captions and local scrolling on mobile.`);
 }finally{await browser.close();}
}
