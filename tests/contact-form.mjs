// Contact form: client validation, submission through /api/contact into the CMS's
// Messages collection, the thank-you state, and the honeypot. Cleans up after itself.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base = process.env.SITE_URL || 'http://127.0.0.1:4321';
const cms = process.env.CMS_URL || 'http://127.0.0.1:1337';
const { credentials: creds } = await import('./helpers/cms-credentials.mjs');
const { data: { token } } = await (await fetch(`${cms}/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(creds),
})).json();
const admin = (path, init = {}) => fetch(cms + path, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
const list = '/content-manager/collection-types/api::message.message';
const marker = `contact-test-${Date.now()}`;
const senderEmail = process.env.CONTACT_TEST_EMAIL || 'test@example.com';

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, timezoneId: 'Asia/Dubai', locale: 'en-IN' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#contact').scrollIntoViewIfNeeded();

  await page.click('.contact-submit');
  assert.match(await page.textContent('.contact-status'), /name/i, 'empty form is rejected');
  await page.fill('#contact-name', 'Contact Test');
  await page.fill('#contact-email', 'not-an-email');
  await page.fill('#contact-message', `Hello from ${marker}, this is a test.`);
  await page.click('.contact-submit');
  assert.match(await page.textContent('.contact-status'), /email/i, 'bad email is rejected');
  assert.equal(await page.getAttribute('#contact-email', 'aria-invalid'), 'true');

  await page.fill('#contact-email', senderEmail);
  await page.click('.contact-submit');
  await page.waitForSelector('.contact-done:not([hidden])');

  const stored = await (await admin(`${list}?pageSize=50&sort=createdAt:desc`)).json();
  const saved = stored.results.find(message => message.message.includes(marker));
  assert.ok(saved, 'message stored in the CMS');
  assert.equal(saved.email, senderEmail);
  assert.equal(saved.timeZone, 'Asia/Dubai');
  assert.equal(saved.ipAddress, '127.0.0.1');
  assert.match(saved.fingerprint, /^[a-f0-9]{64}$/);
  assert.match(saved.userAgent, /Chrome/);
  assert.match(saved.language, /^en-IN/);
  assert.ok(!Number.isNaN(Date.parse(saved.createdAt)));

  // Bots that fill the hidden field get a quiet success and nothing is stored.
  const trap = await (await fetch(`${base}/api/contact`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ name: 'Bot', email: 'bot@example.com', message: `${marker} bot message`, company: 'Spam Inc' }),
  })).json();
  assert.equal(trap.ok, true);
  const after = await (await admin(`${list}?pageSize=50&sort=createdAt:desc`)).json();
  assert.ok(!after.results.some(message => message.message.includes(`${marker} bot`)), 'honeypot not stored');

  // Other sites cannot post through the endpoint.
  assert.equal((await fetch(`${base}/api/contact`, { method: 'POST', headers: { Origin: 'https://evil.example' }, body: '{}' })).status, 403);

  await admin(`${list}/${saved.documentId}`, { method: 'DELETE' });
  assert.deepEqual(errors, []);
  console.log('PASS: contact form validates, stores message and browser metadata in CMS, shows thanks, ignores honeypot, rejects cross-origin posts.');
} finally {
  await browser.close();
}
