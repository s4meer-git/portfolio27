// Production must use the restored CMS, rather than silently create an empty site.
const path = require('node:path');
const Database = require('better-sqlite3');

try {
  const file = path.resolve(process.cwd(), process.env.DATABASE_FILENAME || '.tmp/data.db');
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    if (db.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('Invalid database');
    const seeded = db.prepare('SELECT value FROM strapi_core_store_settings WHERE key = ?')
      .get('core_portfolio_seed-v1');
    if (seeded?.value !== 'true') throw new Error('Database has not been restored');
  } finally {
    db.close();
  }
} catch {
  console.error('CMS startup stopped: restore the verified CMS backup into the configured persistent storage first. See docs/coolify-deployment.md.');
  process.exit(1);
}
