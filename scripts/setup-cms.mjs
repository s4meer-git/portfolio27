import fs from 'node:fs';
import crypto from 'node:crypto';
if (!fs.existsSync('cms/.env')) {
  fs.writeFileSync('cms/.env',fs.readFileSync('cms/.env.example','utf8').replace(/replace-with-random-[a-z-]+/g,()=>crypto.randomBytes(32).toString('hex')),{mode:0o600});
  console.log('Created local CMS secrets.');
}
