const Database = require('better-sqlite3');
const path = require('node:path');
const fs = require('node:fs');

// Keep analytics separate from Strapi-managed content tables, alongside its
// persistent database. Back up this file with the CMS database.
function createVisitorStore(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitor_counter (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL);
    INSERT OR IGNORE INTO visitor_counter (id, total) VALUES (1, 2788);
    CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS visit_counter (id INTEGER PRIMARY KEY CHECK (id = 1), total INTEGER NOT NULL);
    INSERT OR IGNORE INTO visit_counter (id, total) SELECT 1, total FROM visitor_counter WHERE id = 1;
    CREATE TABLE IF NOT EXISTS visits (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL UNIQUE);
  `);
  const record = db.transaction(id => {
    const existing = db.prepare('SELECT ordinal FROM visitors WHERE id = ?').get(id);
    if (existing) return existing;
    db.prepare('UPDATE visitor_counter SET total = total + 1 WHERE id = 1').run();
    const { total } = db.prepare('SELECT total FROM visitor_counter WHERE id = 1').get();
    db.prepare('INSERT INTO visitors (id, ordinal) VALUES (?, ?)').run(id, total);
    return { ordinal: total };
  });
  const recordVisit = db.transaction(id => {
    const existing = db.prepare('SELECT ordinal FROM visits WHERE id = ?').get(id);
    if (existing) {
      const { total } = db.prepare('SELECT total FROM visit_counter WHERE id = 1').get();
      return { ...existing, totalVisits: total };
    }
    db.prepare('UPDATE visit_counter SET total = total + 1 WHERE id = 1').run();
    const { total } = db.prepare('SELECT total FROM visit_counter WHERE id = 1').get();
    db.prepare('INSERT INTO visits (id, ordinal) VALUES (?, ?)').run(id, total);
    return { ordinal: total, totalVisits: total };
  });
  return {
    record: id => record.immediate(id),
    recordVisit: id => recordVisit.immediate(id),
    close: () => db.close(),
  };
}
let store;
function visitorStore() {
  const cmsDatabase = path.resolve(process.cwd(), process.env.DATABASE_FILENAME || '.tmp/data.db');
  store ??= createVisitorStore(path.join(path.dirname(cmsDatabase), 'visitors.db'));
  return store;
}
module.exports = { createVisitorStore, visitorStore };
