// Verify that a real CMS caption edit reaches the page without re-exporting media.
import assert from 'node:assert/strict';
const cms=process.env.CMS_URL||'http://127.0.0.1:1337',site=process.env.SITE_URL||'http://127.0.0.1:4321';
const {api}=await import('./helpers/cms-client.mjs');
const portfolio=await (await fetch(cms+'/api/portfolio')).json();
const state=portfolio.articles.find(article=>article.movieMoments?.length===2);
assert.ok(state,'A published article has two movie scenes');
const endpoint='/content-manager/collection-types/api::article.article/'+state.documentId;
const record=(await api(endpoint)).data;
const moments=record.movieMoments.map(({gif,video,poster,...fields})=>({...fields,gif:gif?.id,video:video?.id,poster:poster?.id}));
assert.equal(moments.length,2);
const config=await api('/content-manager/content-types/api::article.article/configuration');
const articleConfig=config.data?.contentType||config.data||config;
assert.ok(JSON.stringify(config).includes('movieMoments'),'CMS authoring field exists');
assert.ok(articleConfig.layouts.edit.flat().some(f=>f.name==='movieMoments'),'Movie GIFs are visible in the CMS form');
const component=await api('/content-manager/components/portfolio.movie-moment/configuration');
const componentConfig=component.data?.component||component.data||component;
for(const name of ['caption','placement','afterHeading','gif','video','poster','sourceUrl'])assert.ok(componentConfig.layouts.edit.flat().some(f=>f.name===name),'CMS movie field: '+name);
const testCaption='CMS edit: <script>window.badCaption=true</script> & a fresh line';
try{
 await api(endpoint,'PUT',{movieMoments:moments.map((m,i)=>i?m:{...m,caption:testCaption})});await api(endpoint+'/actions/publish','POST');
 const html=await fetch(site+'/articles/'+state.slug).then(r=>r.text());
 assert.ok(html.includes('CMS edit: &lt;script&gt;window.badCaption=true&lt;/script&gt; &amp; a fresh line'));
 assert.ok(!html.includes('<script>window.badCaption=true</script>'));
 const updated=(await api(endpoint)).data;assert.equal(updated.body,record.body);assert.equal(updated.pubDatetime,record.pubDatetime);
 assert.deepEqual(updated.movieMoments.map(m=>m.video?.url),record.movieMoments.map(m=>m.video?.url));
 // A missing or renamed placement target must not put the scene in another section.
 await api(endpoint,'PUT',{movieMoments:moments.map((m,i)=>i?m:{...m,placement:'after-section',afterHeading:'Unmatched heading for placement test'})});await api(endpoint+'/actions/publish','POST');
 const omitted=await fetch(site+'/articles/'+state.slug).then(r=>r.text());
 assert.equal((omitted.match(/data-movie-moment>/g)||[]).length,1);
}finally{
 await api(endpoint,'PUT',{movieMoments:moments});await api(endpoint+'/actions/publish','POST');
}
const restored=(await api(endpoint)).data;assert.deepEqual(restored.movieMoments.map(m=>m.caption),record.movieMoments.map(m=>m.caption));
console.log('CMS caption edits update the bottom overlay immediately, text is escaped, placement is CMS-owned, and original media/body/date are preserved. All test edits restored.');
