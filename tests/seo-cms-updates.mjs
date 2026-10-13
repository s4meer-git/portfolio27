/** Creates only its own temporary article; existing published/draft content is untouched. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
// Use the server targeted by the CMS's SITE_URL revalidation hook.
const site = process.env.SITE_URL || 'http://127.0.0.1:4321';
const { credentials: credentials } = await import('./helpers/cms-credentials.mjs');
const login = await fetch(cms + '/admin/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(credentials) });
assert.ok(login.ok, 'local CMS admin login');
const token = (await login.json()).data.token;
async function api(path, method='GET', data) {
  const response = await fetch(cms + path, { method, headers: {Authorization: `Bearer ${token}`, 'Content-Type':'application/json'}, ...(data ? {body: JSON.stringify(data)} : {}) });
  assert.ok(response.ok, `${method} ${path}: HTTP ${response.status}`);
  if(response.status===204) return;
  return response.json();
}
const slug = `seo-autoupdate-check-${Date.now()}`;
const path = '/articles/' + slug;
const endpoint = '/content-manager/collection-types/api::article.article';
const files = ['/llms.txt','/index.md','/sitemap.xml','/sitemap'];
const read = async file => {
  const r = await fetch(site + file);
  assert.equal(r.status, 200, file);
  assert.match(r.headers.get('cache-control'), /no-cache/);
  const text = await r.text();
  // The global command-menu payload may contain any published page. Verify
  // the actual directory, rather than unrelated interactive component data.
  return file === '/sitemap' ? text.match(/<main[\s\S]*?<\/main>/)?.[0] || '' : text;
};
async function expectDiscovery(present) {
  for (const file of files) assert.equal((await read(file)).includes(path),present,`${file}: ${present?'includes':'excludes'} published article`);
}
let documentId;
try {
  await expectDiscovery(false); // warm all caches
  let data={title:'SEO auto-update verification',slug,pubDatetime:new Date().toISOString(),description:'Temporary CMS update test.',body:'Temporary verification content.',seo:{title:'SEO initial marker',description:'Initial SEO description',noindex:false,includeInSitemap:true}};
  const created=await api(endpoint,'POST',data);documentId=(created.data||created).documentId;
  assert.ok(documentId);
  await expectDiscovery(false);
  await api(`${endpoint}/${documentId}/actions/publish`,'POST');
  await expectDiscovery(true);
  assert.ok((await read('/llms.txt')).includes('SEO initial marker'));
  data={...data,seo:{...data.seo,title:'SEO updated marker',description:'Updated SEO description'}};
  await api(`${endpoint}/${documentId}`,'PUT',data);
  assert.ok((await read('/llms.txt')).includes('SEO initial marker'),'draft SEO stays hidden');
  await api(`${endpoint}/${documentId}/actions/publish`,'POST');
  assert.ok((await read('/llms.txt')).includes('SEO updated marker'),'published title updates without rebuild');
  assert.ok((await read('/index.md')).includes('Updated SEO description'),'published description updates without rebuild');
  data={...data,seo:{...data.seo,noindex:true}};
  await api(`${endpoint}/${documentId}`,'PUT',data);
  await api(`${endpoint}/${documentId}/actions/publish`,'POST');
  await expectDiscovery(false);
  data={...data,seo:{...data.seo,noindex:false}};
  await api(`${endpoint}/${documentId}`,'PUT',data);
  await api(`${endpoint}/${documentId}/actions/publish`,'POST');
  await expectDiscovery(true);
  await api(`${endpoint}/${documentId}/actions/unpublish`,'POST');
  await expectDiscovery(false);
  assert.equal((await fetch(site+path)).status,404);
  console.log('PASS: CMS draft isolation, publish, SEO title/description edits, noindex and unpublish immediately update LLMS, Markdown and XML/HTML sitemaps without rebuilds.');
} finally {
  if(documentId) await api(`${endpoint}/${documentId}`,'DELETE');
}
