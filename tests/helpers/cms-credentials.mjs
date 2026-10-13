import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { parse } = require('../../cms/node_modules/dotenv');
const file = new URL('../../cms/.env', import.meta.url);
const local = fs.existsSync(file) ? parse(fs.readFileSync(file)) : {};
const email = process.env.CMS_LOGIN_ID ?? local.CMS_LOGIN_ID;
const password = process.env.CMS_PASS ?? local.CMS_PASS;
let credentials;
if (email || password) {
  if (!email || !password) throw new Error('CMS tests need both CMS_LOGIN_ID and CMS_PASS.');
  credentials = { email: email.trim().toLowerCase(), password };
} else {
  // Compatibility with older local test setups; new setups use the CMS environment.
  credentials = JSON.parse(fs.readFileSync(new URL('../../.cms-credentials.local', import.meta.url), 'utf8'));
}
export { credentials };
