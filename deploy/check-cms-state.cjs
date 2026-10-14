// Production must use the restored CMS, rather than silently create an empty site.
const path = require('node:path');
const fs = require('node:fs');

const file = path.resolve(process.cwd(), process.env.DATABASE_FILENAME || '.tmp/data.db');
let stage = 'checking the restored database';

try {
  stage = 'checking database file and directory permissions';
  fs.accessSync(file, fs.constants.R_OK | fs.constants.W_OK);
  fs.accessSync(path.dirname(file), fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
  stage = 'loading SQLite';
  const Database = require('better-sqlite3');
  stage = 'opening the restored database';
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    stage = 'checking database integrity';
    if (db.pragma('quick_check', { simple: true }) !== 'ok') throw new Error('Invalid database');
    stage = 'checking the portfolio restore marker';
    const seeded = db.prepare('SELECT value FROM strapi_core_store_settings WHERE key = ?')
      .get('core_portfolio_seed-v1');
    if (seeded?.value !== 'true') throw new Error('Database has not been restored');
  } finally {
    db.close();
  }
} catch (error) {
  const code = String(error.code || 'CHECK_FAILED').replace(/[^A-Z0-9_]/g, '').slice(0, 60);
  const user = typeof process.getuid === 'function' ? process.getuid() : 'unknown';
  console.error(`CMS startup stopped while ${stage} (${code}). Database: ${file}; container UID: ${user}.`);
  console.error('Check that /data/portfolio/cms-data is bind-mounted at /app/cms/.tmp and readable/writable by UID 1000. Restore the verified backup if data is missing. See docs/coolify-deployment.md.');
  process.exit(1);
}
