import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
const require=createRequire(import.meta.url),astroRequire=createRequire(require.resolve('astro/package.json'));const {createServer}=await import(astroRequire.resolve('vite'));
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'portrait-cms-test-'));const oldCache=process.env.IMAGE_CACHE_DIR;process.env.IMAGE_CACHE_DIR=directory;
const server=await createServer({configFile:false,resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}},server:{middlewareMode:true,hmr:false,watch:null},logLevel:'silent'});const originalFetch=globalThis.fetch;
try{
 const {portraitDefinitions}=await server.ssrLoadModule('/src/lib/portraits.ts');const {GET}=await server.ssrLoadModule('/src/pages/api/portrait.ts');
 const image=url=>({url,updatedAt:'2026-10-12T00:00:00Z'});
 const profile={avatar:image('https://cms.example/primary.png'),avatarDark:image('https://cms.example/primary-dark.png'),avatarLabel:'Original',avatarShirt:{color:'#17171a',logo:image('https://cms.example/main.svg')},avatarVariants:[
 {key:'second',label:'Second',enabled:true,avatar:image('https://cms.example/second.webp'),shirt:{color:'#653276',logo:image('https://cms.example/second.svg')},imageScale:1.24,imageOriginY:30},
 {key:'hidden',label:'Hidden',enabled:false,avatar:image('https://cms.example/hidden.webp')},
 {key:'third',label:'Third',enabled:true,avatar:image('https://cms.example/third.webp'),avatarDark:image('https://cms.example/third-dark.webp')},
 ]};
 let items=portraitDefinitions(profile);assert.deepEqual(items.map(x=>x.name),['fortnite','second','third']);assert.equal(items[1].darkSource,items[1].lightSource,'Missing dark image falls back to the same portrait');assert.equal(items[1].logo,'https://cms.example/second.svg');assert.equal(items[1].imageScale,1.24);assert.equal(items[1].imageOriginY,30);
 assert.deepEqual(portraitDefinitions({...profile,avatarVariants:[profile.avatarVariants[2],profile.avatarVariants[0]]}).map(x=>x.name),['fortnite','third','second'],'CMS ordering controls cycling');
 assert.equal(portraitDefinitions({...profile,avatarVariants:[]}).length,1);
 const duplicates=portraitDefinitions({...profile,avatarVariants:[{...profile.avatarVariants[0],key:'fortnite'},{...profile.avatarVariants[0],key:'fortnite'},{...profile.avatarVariants[0],key:'bad"]',imageScale:99,imageOriginY:-8,shirt:{color:'red;display:none'}}]});assert.equal(new Set(duplicates.map(x=>x.name)).size,duplicates.length);assert.ok(duplicates.every(x=>/^[a-z\d-]+$/.test(x.name)));assert.equal(duplicates[3].imageScale,3);assert.equal(duplicates[3].imageOriginY,0);assert.equal(duplicates[3].color,'#17171a');
 const webp=await sharp({create:{width:480,height:480,channels:3,background:'#123456'}}).webp().toBuffer();const png=await sharp({create:{width:960,height:960,channels:3,background:'#654321'}}).png().toBuffer();const calls=[];
 globalThis.fetch=async url=>{calls.push(String(url));return new Response(String(url).endsWith('.webp')?webp:png,{headers:{'Content-Type':String(url).endsWith('.webp')?'image/webp':'image/png'}})};
 const request=(query)=>GET({url:new URL('http://site/api/portrait?'+query),locals:{portfolio:{site:{profile}}}});
 let response=await request('theme=dark&variant=second');assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),webp,'Already optimized artwork is served byte-for-byte');assert.deepEqual(calls,['https://cms.example/second.webp']);
 await request('theme=light&variant=second');assert.equal(calls.length,1,'Shared fallback source uses the same cache');
 response=await request('theme=dark&variant=third');assert.equal(response.status,200);assert.equal(calls.at(-1),'https://cms.example/third-dark.webp');
 response=await request('theme=dark');const encoded=Buffer.from(await response.arrayBuffer());assert.equal((await sharp(encoded).metadata()).width,480);assert.equal((await sharp(encoded).metadata()).format,'webp');assert.equal(calls.at(-1),'https://cms.example/primary-dark.png');
 const count=calls.length;assert.equal((await request('variant=hidden')).status,404);assert.equal((await request('variant=https://evil.example/image')).status,404);assert.equal(calls.length,count,'Only configured and enabled CMS portraits can be requested');
 console.log('PASS: CMS portrait ordering, enable/disable, paired logos, cropping, dark fallback, safe keys, selected-image caching, 480px optimization, exact WebP preservation and unknown-variant rejection.');
}finally{globalThis.fetch=originalFetch;if(oldCache===undefined)delete process.env.IMAGE_CACHE_DIR;else process.env.IMAGE_CACHE_DIR=oldCache;await server.close();await fs.rm(directory,{recursive:true,force:true});}
