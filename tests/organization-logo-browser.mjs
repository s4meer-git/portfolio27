import assert from 'node:assert/strict';import {chromium,webkit} from '@playwright/test';
import {createServer} from 'node:http';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
const source=await(await fetch('http://127.0.0.1:1337/api/portfolio')).json();const fixture=structuredClone(source);
fixture.site.contributions.enabled=false;
fixture.experiences[0].linkedinUrl='https://www.linkedin.com/company/logo-success/';fixture.experiences[0].companyLogo=null;
fixture.experiences[1].linkedinUrl='https://www.linkedin.com/company/logo-blocked/';fixture.experiences[1].companyLogo=null;
fixture.education[0].linkedinUrl='https://www.linkedin.com/school/logo-success/';fixture.education[0].logo=null;
fixture.education[1].linkedinUrl='https://www.linkedin.com/school/manual-override/';fixture.education[1].logo={url:'/uploads/manual.png'};
const png=await sharp({create:{width:100,height:100,channels:4,background:{r:40,g:150,b:180,alpha:1}}}).png().toBuffer();
const mock=createServer((req,res)=>{if(req.url==='/api/portfolio'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(fixture));}else if(req.url.startsWith('/uploads/')){res.setHeader('Content-Type','image/png');res.end(png);}else{res.statusCode=404;res.end();}});
await new Promise(resolve=>mock.listen(0,'127.0.0.1',resolve));const cms='http://127.0.0.1:'+mock.address().port;
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'org-logo-browser-'));const site='http://127.0.0.1:4328';
let output='';const child=spawn(process.execPath,['node_modules/astro/astro.js','dev','--host','127.0.0.1','--port','4328'],{env:{...process.env,CMS_URL:cms,IMAGE_CACHE_DIR:directory},stdio:['ignore','pipe','pipe']});child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
const results=[];
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch(site,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}if(child.exitCode!==null)throw Error(output.slice(-3000));await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'Isolated fixture server starts');
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true,timeout:30000});
  try{for(const width of [1280,375]){
   const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});
   await context.route('**/api/spotify',r=>r.fulfill({json:{status:'unavailable'}}));await context.route('**/api/visitors',r=>r.fulfill({json:{count:0}}));
   const fetched=[];await context.route('**/api/organization-logo?*',r=>{const url=new URL(r.request().url());const target=url.searchParams.get('url');fetched.push(target);return target.includes('logo-blocked')?r.fulfill({status:404,body:'Unavailable'}):r.fulfill({status:200,contentType:'image/png',body:png})});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(site);await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-page-loading'));await page.waitForLoadState('networkidle');
   assert.equal(await page.locator('organization-logo').count(),3,'Only configured records without uploads request automatic images');
   for(const section of ['experience','education']){await page.locator('#'+section).scrollIntoViewIfNeeded();await page.locator('#'+section+' organization-logo').first().locator('img').scrollIntoViewIfNeeded();await page.waitForFunction(section=>document.querySelector('#'+section+' organization-logo').dataset.logoReady==='true',section)}
   const failed=page.locator('#experience organization-logo').nth(1);await failed.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelectorAll('#experience organization-logo')[1].querySelector('img').hidden);assert.ok(await failed.locator('.org-logo-fallback').isVisible());
   assert.ok(fetched.includes(fixture.experiences[0].linkedinUrl));assert.ok(fetched.includes(fixture.education[0].linkedinUrl));assert.ok(!fetched.some(x=>x.includes('manual-override')),'Uploaded logos suppress automatic fetching');
   assert.equal(await page.locator('#education img[src$="/uploads/manual.png"]').count(),1);
   for(const theme of ['light','dark']){await page.evaluate(t=>document.documentElement.classList.toggle('dark',t==='dark'),theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('#experience > div').first().evaluate(el=>getComputedStyle(el).borderBottomWidth),'1px');assert.equal(await page.locator('#education > div').first().evaluate(el=>getComputedStyle(el).borderBottomWidth),'1px');}
   const trigger=page.getByRole('button',{name:fixture.education[0].school+' details',exact:true});const expanded=await trigger.getAttribute('aria-expanded');await trigger.click();assert.notEqual(await trigger.getAttribute('aria-expanded'),expanded);
   assert.deepEqual(errors,[]);results.push({browser:engine.name(),width,automaticImages:true,blockedFallback:true,uploadOverride:true,outlines:true,expandableEducation:true,themes:['light','dark']});await context.close();
  }}finally{await browser.close()}
 }

 console.log('PASS: Isolated Chromium/WebKit desktop/mobile checks for automatic logos, blocked-page fallback, upload priority, light/dark, outlines and education expansion. Production CMS content was never changed.');
}finally{child.kill('SIGTERM');await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));await new Promise(resolve=>mock.close(resolve));await fs.rm(directory,{recursive:true,force:true});}
