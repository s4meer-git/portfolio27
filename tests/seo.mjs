import assert from 'node:assert/strict';
import { pageMetadata, discoverablePages, originFor, redirectTarget, ownedDomains, xml } from '../src/lib/seo.ts';
const p = {
  site: { profile: { displayName: 'Sameer Chauhan', role: 'Engineer', about: 'Builds software.' },
    seo: { title: 'Sameer Chauhan', canonicalOrigin: 'https://s4meer.com', siteName: 'Sameer Chauhan' },
    articleLabels: { pageTitle: 'Articles' }, projectLabels: { pageTitle: 'Projects' }, publicationLabels: { pageTitle: 'Publications' }, articlesPerPage: 1 },
  articles: [ { id: 'first', data: { title: 'First', description: 'An article', pubDatetime: new Date('2025-01-01'), updatedAt: '2025-02-01', category: { slug: 'code' } } }, { id: 'second', data: { title: 'Second' } } ],
  projects: [{ id: 'work', data: { name: 'Work', description: 'A project' } }],
  publications: [{ id: 'paper', data: { title: 'Paper', authors: 'Sameer Chauhan, Jane Smith', publishedOn: '2025-03-01' } }],
  categories: [{ slug: 'code', name: 'Code' }, { slug: 'empty', name: 'Empty' }], series: [],
};
let checks = 0;
const test = (label, fn) => { fn(); checks++; console.log('PASS', label); };
test('primary-domain canonical independent of the request host', () => assert.equal(pageMetadata(p, '/articles/first/').canonical, 'https://s4meer.com/articles/first'));
test('page types and stable author graph', () => {
  const types = path => pageMetadata(p, path).structuredData['@graph'].map(n=>n['@type']);
  assert.ok(types('/').includes('ProfilePage')); assert.ok(!types('/').includes('BlogPosting'));
  assert.ok(types('/articles/first').includes('BlogPosting'));
  assert.ok(types('/projects/work').includes('CreativeWork'));
  assert.ok(types('/publications/paper').includes('ScholarlyArticle'));
  const paper = pageMetadata(p, '/publications/paper').structuredData['@graph'].find(n=>n['@type']==='ScholarlyArticle');
  assert.deepEqual(paper.author,[{'@id':'https://s4meer.com/#person'},{'@type':'Person',name:'Jane Smith'}]);
});
test('pagination has its own title and canonical, empty categories excluded', () => {
  const page = pageMetadata(p, '/articles/2');
  assert.match(page.title,/Page 2/); assert.equal(page.canonical,'https://s4meer.com/articles/2');
  assert.ok(!discoverablePages(p).some(x=>x.path.includes('/empty')));
});
test('breadcrumb hierarchy is home, section, detail', () => assert.deepEqual(pageMetadata(p, '/articles/first').crumbs.map(c=>c.path),['/','/articles','/articles/first']));
test('per-entry SEO and CMS exact-path overrides', () => {
  const q=structuredClone(p);q.articles[0].data.seo={title:'Entry title',description:'Entry description'};
  q.site.seo.pages=[{path:'/articles/first',metadata:{title:'Override', noindex:true}}];
  const m=pageMetadata(q,'/articles/first');assert.match(m.title,/Override/);assert.equal(m.description,'Entry description');assert.match(m.robots,/noindex/);
  assert.ok(!discoverablePages(q).some(x=>x.path==='/articles/first'));
});
test('foreign canonical excluded; unsafe canonical rejected', () => {
  const q=structuredClone(p);q.articles[0].data.seo={canonicalUrl:'https://example.com/original'};
  assert.ok(!discoverablePages(q).some(x=>x.path==='/articles/first'));
  q.articles[0].data.seo.canonicalUrl='javascript:alert(1)';assert.equal(pageMetadata(q,'/articles/first').canonical,'https://s4meer.com/articles/first');
});
test('global noindex empties discovery', () => { const q=structuredClone(p);q.site.seo.indexingEnabled=false;assert.equal(discoverablePages(q).length,0);assert.match(pageMetadata(q,'/').robots,/noindex/); });
test('domain parsing and canonical fallback reject unsafe URLs', () => {
  assert.equal(originFor({seo:{canonicalOrigin:'javascript:bad'}}),'https://s4meer.com');
  assert.equal(ownedDomains({seo:{ownedDomains:[{url:'sameerchauhan.com'}]}})[0].url,'https://sameerchauhan.com');
});
test('redirect chains resolve, loops and off-site destinations rejected', () => {
  const site={seo:{redirects:[{fromPath:'/old',toPath:'/middle'},{fromPath:'/middle',toPath:'/new'}]}};
  assert.equal(redirectTarget(site,'/old'),'/new');
  site.seo.redirects.push({fromPath:'/new',toPath:'/old'});assert.equal(redirectTarget(site,'/old'),undefined);
  site.seo.redirects=[{fromPath:'/old',toPath:'//evil.example'}];assert.equal(redirectTarget(site,'/old'),undefined);
});
test('XML encoding protects sitemap output', () => assert.equal(xml('a&b<"'), 'a&amp;b&lt;&quot;'));
console.log(`${checks} SEO policy tests passed.`);
