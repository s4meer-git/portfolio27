// Exercise the real controller and Nodemailer provider without sending real mail.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const { contactEmail } = require('../cms/src/lib/contact-email.js');
const { contactEmailAssets } = require('../cms/src/lib/contact-email-assets.js');
const { contactMetadata, clientAddress, validTimeZone } = require('../cms/src/lib/contact-metadata.js');
const provider = require('../cms/node_modules/@strapi/provider-email-nodemailer');
const controller = require('../cms/src/api/message/controllers/message.js');
const profile = { displayName: 'Sameer Chauhan', email: 'owner@example.com', timeZone: 'Asia/Dubai', role: 'Software Engineer / Full-stack Developer', location: 'Dubai, United Arab Emirates', slogan: 'Coding, Creativity, Coffee...' };
const publicDir = path.resolve('cms/public');
const site = { profile, seo: { canonicalOrigin: 'https://s4meer.com', desc: 'My digital space, projects, insights, and thoughts on software engineering.' }, footer: { title: 'S4MEER.COM' }, navigation: [
  { label: 'Home', href: '/' }, { label: 'Articles', href: '/articles' },
  { label: 'Publications', href: '/publications' }, { label: 'Projects', href: '/projects' },
] };
const assets = await contactEmailAssets(site, publicDir);
const sharp = require('../cms/node_modules/sharp');
const entry = {
  name: 'Arun Sharma', email: 'arun.sharma@example.com',
  message: 'Hi Sameer,\n\nI came across your article on rate limiting while working on our API.\nCould we discuss how you would approach this for a small team?\n\nThanks,\nArun',
  createdAt: '2026-10-10T16:55:00.000Z', timeZone: 'Asia/Kolkata',
  ipAddress: '203.0.113.42', language: 'en-IN,en;q=0.9',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  fingerprint: 'a'.repeat(64),
};
const rendered = contactEmail(entry, profile, { ...site, assets });
assert.equal(rendered.replyTo.address, entry.email);
assert.ok(rendered.text.includes('Name: Arun Sharma\nEmail: arun.sharma@example.com'));
assert.ok(rendered.text.includes('Asia/Dubai'));
assert.ok(rendered.text.includes('22:25:00'));
assert.ok(rendered.text.includes('20:55:00'));
assert.ok(rendered.text.includes(entry.createdAt));
assert.ok(rendered.html.includes('Hi Sameer,<br><br>I came across'));
assert.ok(rendered.html.includes('mailto:arun.sharma%40example.com?subject='));
assert.ok(rendered.html.includes('cid:site-logo@portfolio'));
assert.ok(rendered.html.includes('cid:site-wordmark@portfolio'));
assert.ok(rendered.html.includes('cid:sender-avatar@portfolio'));
const senderAttachment = assets.attachments.find(attachment => attachment.cid === 'sender-avatar@portfolio');
assert.ok(senderAttachment && senderAttachment.content.length < 50000, 'shared sender illustration is embedded and small');
assert.ok(!rendered.html.includes('https://s4meer.com/articles'), 'no automatic website navigation in the signature');
assert.ok(!rendered.html.includes(profile.slogan), 'no automatic biography tagline');
assert.ok(rendered.html.includes(profile.role));
assert.ok(rendered.html.includes(profile.location));
assert.ok(!rendered.html.includes(site.seo.desc), 'no automatic website biography');
assert.ok(!rendered.html.includes('This message is also saved in your CMS'));
assert.ok(!rendered.text.includes('This message is also saved in your CMS'));
assert.ok(rendered.html.includes('Website enquiry'));
assert.ok(rendered.html.includes('class="sender-identity"'));
assert.ok(rendered.html.includes(`To: ${profile.email}`));
assert.ok(rendered.html.includes('class="sender-date"'));
assert.ok(!/4x4|@font-face|fonts\//i.test(rendered.html), 'email logos have no font dependency');
assert.ok((await sharp((assets.attachments[0]).content).metadata()).hasAlpha, 'logo is an image cutout');
const { data: wordmarkPixels, info: wordmarkInfo } = await sharp(assets.attachments[1].content).removeAlpha().raw().toBuffer({ resolveWithObject: true });
let whitePixels = 0;
for (let offset = 0; offset < wordmarkPixels.length; offset += wordmarkInfo.channels) {
  if (wordmarkPixels[offset] === 255 && wordmarkPixels[offset + 1] === 255 && wordmarkPixels[offset + 2] === 255) whitePixels++;
}
assert.ok(whitePixels > wordmarkInfo.width * wordmarkInfo.height * 0.1, 'footer letters are solid white');
assert.equal(wordmarkPixels[0], 0, 'footer background is black');
assert.ok(!/\p{Extended_Pictographic}|[↗↘↖↙]/u.test(rendered.html), 'no decorative emoji or arrow glyphs');
assert.ok(!rendered.html.includes('CONTACT / INBOX'));
assert.ok(!rendered.html.includes('From the website'));
const lightAssets = await contactEmailAssets({ ...site, emailBranding: { theme: 'light' } }, publicDir);
const lightEmail = contactEmail(entry, profile, { ...site, emailBranding: { theme: 'light' }, assets: lightAssets });
assert.ok(lightEmail.html.includes('bgcolor="#ffffff"'));
assert.equal(lightEmail.html, rendered.html, 'legacy CMS theme cannot change email appearance');
assert.ok(lightAssets.attachments[0].content.equals(assets.attachments[0].content), 'logo image stays the same across themes');
assert.ok(lightAssets.attachments[1].content.equals(assets.attachments[1].content), 'footer image stays the same across themes');
const customized = contactEmail(entry, { ...profile, displayName: 'Updated CMS Name' }, { ...site,
  seo: { canonicalOrigin: 'https://example.com' }, emailBranding: {
    websiteDescription: 'CMS website description', signatureText: 'My own sign-off\nSecond line',
    footerNote: 'CMS footer note', showFooterWordmark: false,
    signatureLinks: [{ label: 'Profile', href: '/about' }, { label: 'Unsafe', href: 'javascript:alert(1)' }],
  }, assets,
});
assert.ok(customized.html.includes('CMS website description'));
assert.ok(customized.html.includes('My own sign-off<br>Second line'));
assert.ok(customized.html.includes('CMS footer note'));
assert.ok(customized.html.includes('Updated CMS Name'));
assert.ok(customized.html.includes('https://example.com/about'));
assert.ok(!customized.html.includes('javascript:'));
assert.ok(!customized.html.includes('cid:site-wordmark@portfolio'));
assert.equal(customized.replyTo.address, entry.email);
const fallbackAssets = await contactEmailAssets({ emailBranding: { logo: { url: 'https://untrusted.invalid/logo.png' }, showFooterWordmark: false } }, publicDir);
assert.equal(fallbackAssets.attachments.length, 2);
assert.ok(fallbackAssets.attachments[0].content.equals(assets.attachments[0].content));
const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contact-email-assets-'));
try {
  fs.mkdirSync(path.join(isolatedDir, 'brand'));
  fs.mkdirSync(path.join(isolatedDir, 'uploads'));
  for (const file of ['sc-logo-cutout.png', 's4meer-logo-cutout.png', 'sc-email.png', 'sender-avatar.png']) fs.copyFileSync(path.join(publicDir, 'brand', file), path.join(isolatedDir, 'brand', file));
  fs.writeFileSync(path.join(isolatedDir, 'uploads', 'test-logo.png'), assets.attachments[0].content);
  const customAssets = await contactEmailAssets({ emailBranding: { logo: { url: '/uploads/test-logo.png' }, senderAvatar: { url: '/uploads/test-logo.png' } }, profile: { avatar: { url: '/uploads/test-logo.png' } } }, isolatedDir);
  assert.equal(customAssets.attachments.length, 4);
  const sharp = require('../cms/node_modules/sharp');
  const logoSize = await sharp(customAssets.attachments[0].content).metadata();
  assert.equal(logoSize.width, 264);
  assert.equal(logoSize.height, 120);
  const avatarSize = await sharp(customAssets.attachments[2].content).metadata();
  assert.equal(avatarSize.width, 120);
  assert.equal(avatarSize.height, 120);
  const customSender = customAssets.attachments.find(attachment => attachment.cid === 'sender-avatar@portfolio');
  assert.ok(!customSender.content.equals(senderAttachment.content), 'CMS sender avatar override is used');
  assert.equal((await sharp(customSender.content).metadata()).width, 132);
  fs.symlinkSync(path.join(publicDir, 'brand', 'sc-email.png'), path.join(isolatedDir, 'uploads', 'outside.png'));
  const rejectedPath = await contactEmailAssets({ emailBranding: { logo: { url: '/uploads/outside.png' } } }, isolatedDir);
  assert.ok(rejectedPath.attachments[0].content.equals(assets.attachments[0].content), 'symlinks cannot read files outside uploads');
} finally { fs.rmSync(isolatedDir, { recursive: true, force: true }); }

const malicious = contactEmail({ ...entry, name: '<img src=x onerror=alert(1)>', message: '<script>alert(1)</script>\nKeep & check', timeZone: 'invalid' }, profile);
assert.ok(!malicious.html.includes('<script>'));
assert.ok(malicious.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;<br>Keep &amp; check'));
assert.ok(malicious.html.includes('Not shared'));
const headerAttack = contactEmail({ ...entry, name: 'Arun\r\nBcc: someone@example.com' }, profile);
assert.ok(!/[\r\n]/.test(headerAttack.replyTo.name));
assert.ok(!/[\r\n]/.test(headerAttack.subject));

const ctx = {
  request: { body: { ...entry, ipAddress: '1.2.3.4', fingerprint: 'forged', createdAt: '2000-01-01' }, ip: '127.0.0.1', headers: {
    'x-forwarded-for': entry.ipAddress, 'user-agent': entry.userAgent, 'accept-language': entry.language,
  } },
  req: { socket: { remoteAddress: '127.0.0.1' } },
};
const metadata = contactMetadata(ctx);
assert.equal(metadata.ipAddress, entry.ipAddress);
assert.match(metadata.fingerprint, /^[a-f0-9]{64}$/);
assert.equal(contactMetadata(ctx).fingerprint, metadata.fingerprint);
assert.equal(contactMetadata({ ...ctx, request: { ...ctx.request, body: { ...ctx.request.body, message: 'Different', email: 'changed@example.com' } } }).fingerprint, metadata.fingerprint);
assert.equal(clientAddress({ ...ctx, req: { socket: { remoteAddress: '198.51.100.9' } } }), '198.51.100.9', 'remote callers cannot spoof forwarded IP');
assert.equal(validTimeZone('invalid'), null);
assert.equal(contactMetadata({ request: { body: {}, headers: {}, ip: '::1' } }).fingerprint, null);

const smtp = provider.init({ streamTransport: true, buffer: true, newline: 'unix' }, { defaultFrom: 'Sameer Chauhan <contact@mail.s4meer.com>' });
let saved;
let options;
let complete;
const sent = new Promise(resolve => { complete = resolve; });
const previousHost = process.env.SMTP_HOST;
const previousRecipient = process.env.CONTACT_NOTIFY_TO;
process.env.SMTP_HOST = 'test.invalid';
delete process.env.CONTACT_NOTIFY_TO;
global.strapi = {
  documents: uid => uid === 'api::message.message' ? {
    create: async ({ data }) => { saved = { ...data, createdAt: entry.createdAt }; return saved; },
  } : { findFirst: async () => site },
  dirs: { static: { public: publicDir } },
  plugin: () => ({ service: () => ({ send: async value => {
    options = value;
    const info = await smtp.send(value);
    complete(info);
    return info;
  } }) }),
  log: { info() {}, warn() {}, error: error => { throw new Error(error); } },
};
try {
  await controller.submit(ctx);
  const info = await Promise.race([sent, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Notification was not generated')), 5000); timer.unref(); })]);
  assert.deepEqual(ctx.body, { ok: true });
  assert.equal(saved.createdAt, entry.createdAt, 'server timestamp is used');
  assert.equal(saved.fingerprint, metadata.fingerprint, 'caller cannot provide the fingerprint');
  assert.equal(saved.ipAddress, entry.ipAddress);
  assert.equal(options.to, profile.email);
  assert.equal(options.replyTo.address, entry.email);
  const mime = info.message.toString();
  assert.match(mime, /Reply-To: Arun Sharma <arun\.sharma@example\.com>/i);
  assert.match(mime, /From: Sameer Chauhan <contact@mail\.s4meer\.com>/i);
  assert.match(mime, /Content-Type: multipart\/alternative/i);
  assert.match(mime, /Content-Type: text\/plain/i);
  assert.match(mime, /Content-Type: text\/html/i);
  assert.match(mime, /Content-ID: <site-logo@portfolio>/i);
  assert.match(mime, /Content-ID: <site-wordmark@portfolio>/i);
  assert.match(mime, /Content-ID: <sender-avatar@portfolio>/i);
  assert.match(mime, /Content-Type: image\/png/i);

  // Validation and the honeypot must never generate a notification.
  saved = null;
  const invalid = { ...ctx, request: { ...ctx.request, body: { ...entry, email: 'arun@example.com>, other@example.com' } } };
  await controller.submit(invalid);
  assert.equal(invalid.status, 400);
  assert.equal(saved, null);
  const bot = { ...ctx, request: { ...ctx.request, body: { ...entry, company: 'Bot' } } };
  await controller.submit(bot);
  assert.deepEqual(bot.body, { ok: true });
  assert.equal(saved, null);
} finally {
  if (previousHost === undefined) delete process.env.SMTP_HOST; else process.env.SMTP_HOST = previousHost;
  if (previousRecipient === undefined) delete process.env.CONTACT_NOTIFY_TO; else process.env.CONTACT_NOTIFY_TO = previousRecipient;
  delete global.strapi;
}

const dir = path.join(os.tmpdir(), 'portfolio-contact-email-preview');
fs.mkdirSync(dir, { recursive: true });
const previewHtml = email => email.attachments.reduce((html, attachment) => html.replaceAll(`cid:${attachment.cid}`, `data:${attachment.contentType};base64,${attachment.content.toString('base64')}`), email.html);
let previewEmail = rendered;
if (process.env.CONTACT_PREVIEW_CMS) {
  const response = await fetch(`${process.env.CONTACT_PREVIEW_CMS}/api/portfolio`, { signal: AbortSignal.timeout(8000) });
  assert.ok(response.ok);
  const { site: liveSite } = await response.json();
  const liveAssets = await contactEmailAssets(liveSite, publicDir);
  previewEmail = contactEmail(entry, liveSite.profile, { ...liveSite, assets: liveAssets });
}
fs.writeFileSync(path.join(dir, 'preview.html'), previewHtml(previewEmail));
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const [label, width] of [['desktop', 800], ['mobile', 375]]) {
    const page = await browser.newPage({ viewport: { width, height: 1200 } });
    await page.setContent(previewHtml(previewEmail));
    assert.equal(await page.locator('h1').textContent(), 'Website enquiry');
    assert.equal(await page.getByRole('link', { name: 'Reply to sender', exact: true }).count(), 1);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
    assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), 'wordmarks render from embedded assets');
    await page.screenshot({ path: path.join(dir, `${label}.png`), fullPage: true });
    // Long unbroken visitor text must also fit on mobile.
    await page.setContent(previewHtml(contactEmail({ ...entry, name: 'A'.repeat(100), email: `${'a'.repeat(64)}@example.com`, message: 'W'.repeat(5000) }, profile, { ...site, assets })));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'long content does not overflow');
    await page.close();
  }
  const lightPage = await browser.newPage({ viewport: { width: 375, height: 1200 } });
  await lightPage.setContent(previewHtml(lightEmail));
  assert.ok(await lightPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'light appearance fits mobile');
  assert.ok(await lightPage.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)));
  await lightPage.screenshot({ path: path.join(dir, 'mobile-light.png'), fullPage: true });
  await lightPage.close();
} finally { await browser.close(); }
console.log('PASS: reply routing, embedded website wordmarks, CMS branding overrides, HTML/plain text, escaping, metadata integrity, validation, and desktop/mobile layout.');
