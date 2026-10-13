import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
let token;
async function api(path, method='GET', data) {
  const res=await fetch(cms+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});
  const body=await res.json();
  assert.ok(res.ok,`${method} ${path}: ${res.status} ${JSON.stringify(body)}`);
  return body;
}
const init=await api('/admin/init');
const credentialFile='.cms-credentials.local';
if (!init.data.hasAdmin) {
  const credentials={email:'admin@portfolio.local',password:crypto.randomBytes(20).toString('base64url')+'A1!',firstname:'Portfolio',lastname:'Admin'};
  await api('/admin/register-admin','POST',credentials);
  fs.writeFileSync(credentialFile,JSON.stringify(credentials,null,2)+'\n',{mode:0o600});
}
const { credentials } = await import('./helpers/cms-credentials.mjs');
const login=await api('/admin/login','POST',credentials);
token=login.data.token;
assert.ok(token,'Local password login');
const initial=await api('/api/portfolio');
for (const collection of ['articles','projects','experiences']) {
  assert.ok(Array.isArray(initial[collection]),`${collection} is exposed to the website`);
}
assert.ok(initial.education.length>=1,'Education entries are exposed to the website');
assert.ok(initial.categories.length>=1,'Categories are exposed to the website');
assert.ok(initial.series.length>=1,'Series are exposed to the website');
const settingsPath='/content-manager/single-types/api::site-setting.site-setting';
const settings=await api(settingsPath);
const original=settings.data || settings;
const marker=`CMS test ${Date.now()}`;
try {
  await api(settingsPath,'PUT',{...original,profile:{...original.profile,displayName:marker}});
  assert.equal((await api('/api/portfolio')).site.profile.displayName,initial.site.profile.displayName,'Draft must stay hidden');
  await api(settingsPath+'/actions/publish','POST');
  const html=await (await fetch(site)).text();
  assert.ok(html.includes(marker),'Published name must immediately render');
} finally {
  await api(settingsPath,'PUT',original);
  await api(settingsPath+'/actions/publish','POST');
}
for (const path of ['/', '/articles','/articles/2','/projects',...initial.articles.map(a=>'/articles/'+a.slug),...initial.projects.map(p=>'/projects/'+p.slug)]) {
  assert.equal((await fetch(site+path)).status,200,path);
}
assert.equal((await fetch(site+'/articles/does-not-exist')).status,404);
assert.equal((await fetch(site+'/projects/does-not-exist')).status,404);
for(const path of ['/content-manager/single-types/api::site-setting.site-setting','/upload/files']) assert.equal((await fetch(cms+path)).status,401,'Admin content requires login');
assert.equal((await fetch(cms+'/api/portfolio',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,405,'Public endpoint is read-only');
const form = new FormData();
form.append('files', new Blob([fs.readFileSync('cms/favicon.png')], {type:'image/png'}), 'cms-test-image.png');
const uploadResponse = await fetch(cms+'/upload', {method:'POST',headers:{Authorization:`Bearer ${token}`},body:form});
assert.ok(uploadResponse.ok, 'Authenticated media upload');
const [uploaded] = await uploadResponse.json();
let created;
let testCategory;
try {
  testCategory=(await api('/content-manager/collection-types/api::category.category','POST',
    {name:'CMS integration test',slug:'cms-integration-test-category'})).data;
  const articlePath='/content-manager/collection-types/api::article.article';
  const result=await api(articlePath, 'POST', {title:marker,slug:'cms-integration-test',pubDatetime:new Date().toISOString(),description:'Temporary verification',category:testCategory.documentId,body:'## Uploaded image\n\n![Test]('+uploaded.url+')',image:uploaded.id});
  created=result.data || result;
  assert.equal((await fetch(site+'/articles/cms-integration-test')).status,404,'New drafts must be hidden');
  await api(articlePath+'/'+created.documentId+'/actions/publish','POST');
  const rendered=await (await fetch(site+'/articles/cms-integration-test')).text();
  assert.ok(rendered.includes(marker),'New articles are immediately routed');
  assert.ok(rendered.includes(cms+uploaded.url),'Uploaded images are served by CMS');
  assert.equal((await fetch(cms+uploaded.url)).status,200);
  await api(articlePath+'/'+created.documentId+'/actions/unpublish','POST');
  assert.equal((await fetch(site+'/articles/cms-integration-test')).status,404,'Unpublishing immediately removes article');
} finally {
  if(created) await api('/content-manager/collection-types/api::article.article/'+created.documentId,'DELETE');
  if(testCategory) await api('/content-manager/collection-types/api::category.category/'+testCategory.documentId,'DELETE');
  await api('/upload/files/'+uploaded.id,'DELETE');
}
console.log('PASS: password login, seeded content, draft isolation, live publishing, all detail pages, 404s, protected admin, read-only public API.');
