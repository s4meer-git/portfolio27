// Guards the two ways a logo can silently disappear from the website:
//   1. a stored icon name that no longer resolves (the website falls back to a
//      generic link icon without complaining),
//   2. the Strapi picker drifting out of sync with the icons the site can render.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as DeveloperIcons from 'developer-icons';
import { buildCatalog, render } from '../scripts/sync-custom-icons.mjs';

const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';

// --- the picker's custom-logo file is generated; it must match its source ---
const generated = readFileSync(new URL('../cms/src/admin/custom-icons.mjs', import.meta.url), 'utf8');
assert.equal(
  generated,
  render(buildCatalog()),
  'cms/src/admin/custom-icons.mjs is stale -- run: npm run cms:sync-icons'
);

const { customIconNames } = await import('../cms/src/admin/custom-icons.mjs');
const { ROLE_ICON_NAMES } = await import('../cms/src/admin/role-icons.mjs');
const known = new Set([
  ...customIconNames,
  ...Object.keys(DeveloperIcons).filter(n => /^[A-Z]/.test(n) && typeof DeveloperIcons[n] === 'function'),
  // Interface icons for roles and schools, rendered from lucide.
  ...ROLE_ICON_NAMES,
]);
assert.ok(known.size > 200, `Expected a full icon catalog, got ${known.size}`);

// --- every icon name actually stored in the CMS must resolve ---
const { renderRoleIcons } = await import('../scripts/sync-custom-icons.mjs');
assert.equal(
  readFileSync(new URL('../cms/src/admin/role-icons.mjs', import.meta.url), 'utf8'),
  renderRoleIcons(),
  'cms/src/admin/role-icons.mjs is stale -- run: npm run cms:sync-icons'
);

const { site, experiences, education } = await (await fetch(`${cms}/api/portfolio`)).json();
const stored = [
  ...(site.skills || []).map(s => ['skill', s.title, s.icon, s.image]),
  ...(site.socialLinks || []).map(l => ['link', l.label, l.icon, l.image]),
  ...(experiences || []).map(e => ['company', e.company, e.companyIcon, e.companyLogo]),
  ...(experiences || []).flatMap(e =>
    (e.positions || []).map(p => ['role', p.title, p.icon, null])
  ),
  ...(education || []).map(e => ['school', e.school, e.icon, e.logo]),
];

const broken = stored.filter(([, , icon, image]) => icon && !known.has(icon) && !image);
assert.deepEqual(
  broken.map(([kind, name, icon]) => `${kind} "${name}" -> "${icon}"`),
  [],
  'These entries reference a logo that no longer exists'
);

// An entry with neither a logo nor an uploaded image renders a generic link icon.
// That is legal, so report it rather than failing.
const iconless = stored.filter(([, , icon, image]) => !icon && !image);
if (iconless.length) {
  console.log(
    `NOTE: ${iconless.length} entr${iconless.length === 1 ? 'y has' : 'ies have'} no logo ` +
      `and render a generic link icon: ${iconless.map(([, name]) => name).join(', ')}`
  );
}

console.log(
  `PASS: picker catalog is in sync (${known.size} logos), ` +
    `all ${stored.filter(s => s[2]).length} stored icon names resolve.`
);
