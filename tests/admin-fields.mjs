// Every field the admin labels must actually be reachable in the edit form.
//
// A field can carry metadata, be marked visible, and still never render: the
// content-manager keeps a separate layout, and a field missing from it is simply
// absent from the form. That is how `prefix` disappeared from the links editor,
// which made it look as though a link's label could only sit at the end.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const CMS = process.env.CMS_URL || 'http://127.0.0.1:1337';
const { credentials: creds } = await import('./helpers/cms-credentials.mjs');

let token;
for (let i = 0; i < 25 && !token; i++) {
  const res = await fetch(`${CMS}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  const body = await res.json().catch(() => ({}));
  if (body?.data?.token) token = body.data.token;
  else await new Promise(r => setTimeout(r, 12000));
}
assert.ok(token, 'logged in to the admin');
const headers = { Authorization: `Bearer ${token}` };

const get = async path => (await fetch(CMS + path, { headers })).json();

// Ask the CMS which components and content types exist rather than hard-coding a
// list, so a type added later is covered automatically.
const { data: components } = await get('/content-type-builder/components');
const { data: contentTypes } = await get('/content-type-builder/content-types');

const targets = [
  ...components
    .filter(c => c.uid.startsWith('portfolio.'))
    .map(c => ({ uid: c.uid, url: `/content-manager/components/${c.uid}/configuration`, kind: 'component' })),
  ...contentTypes
    .filter(t => t.uid.startsWith('api::'))
    .map(t => ({ uid: t.uid, url: `/content-manager/content-types/${t.uid}/configuration`, kind: 'content type' })),
];

const SKIP = new Set([
  'id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt',
  'createdBy', 'updatedBy', 'locale', 'localizations',
]);

const problems = [];
let checked = 0;

for (const target of targets) {
  const config = await get(target.url);
  const node = config.data?.component ?? config.data?.contentType;
  if (!node) continue;

  const inLayout = new Set((node.layouts?.edit ?? []).flat().map(f => f.name));
  for (const [field, meta] of Object.entries(node.metadatas ?? {})) {
    if (SKIP.has(field)) continue;
    if (meta?.edit?.visible === false) continue;
    checked += 1;
    if (!inLayout.has(field)) {
      problems.push(`${target.kind} ${target.uid}: "${field}" is visible but missing from the edit layout`);
    }
  }
}

assert.deepEqual(problems, [], problems.join('\n'));
console.log(`PASS: ${checked} editable fields across ${targets.length} types all appear in the admin form.`);
