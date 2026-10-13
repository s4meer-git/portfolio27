const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createVisitorStore } = require('../cms/src/lib/visitors');
const Database = require('../cms/node_modules/better-sqlite3');
const directory = mkdtempSync(join(tmpdir(), 'portfolio-visitors-'));
const file = join(directory, 'visitors.db');
let first, second;
try {
  first = createVisitorStore(file);
  assert.equal(first.record('browser-a').ordinal, 2789);
  assert.equal(first.record('browser-a').ordinal, 2789);
  second = createVisitorStore(file);
  assert.equal(second.record('browser-b').ordinal, 2790);
  assert.equal(first.record('browser-b').ordinal, 2790);
  first.close(); first = createVisitorStore(file);
  assert.equal(first.record('browser-a').ordinal, 2789);
  assert.equal(first.record('browser-c').ordinal, 2791);
  assert.equal(first.recordVisit('page-a').totalVisits, 2789);
  assert.equal(second.recordVisit('page-a').totalVisits, 2789, 'request retries do not count twice');
  assert.equal(second.recordVisit('page-b').totalVisits, 2790, 'a reload with a new page id increases visits');
  first.close(); first = createVisitorStore(file);
  assert.equal(first.recordVisit('page-b').totalVisits, 2790, 'retry remains deduplicated after restart');
  assert.equal(first.recordVisit('page-c').totalVisits, 2791);
  assert.equal(first.recordVisit('page-a').ordinal, 2789);
  assert.equal(first.recordVisit('page-a').totalVisits, 2791, 'a retry returns the latest total without incrementing');
  const legacyFile = join(directory, 'legacy.db');
  const legacy = new Database(legacyFile);
  legacy.exec('CREATE TABLE visitor_counter (id INTEGER PRIMARY KEY, total INTEGER NOT NULL); INSERT INTO visitor_counter VALUES (1, 4200);');
  legacy.close();
  const migrated = createVisitorStore(legacyFile);
  try { assert.equal(migrated.recordVisit('new-page').totalVisits, 4201, 'existing counter is preserved on migration'); }
  finally { migrated.close(); }
  console.log('PASS: per-load visits, retry deduplication, shared database, restart persistence, historical counter migration and legacy visitor records.');
} finally {
  first?.close(); second?.close(); rmSync(directory, { recursive: true, force: true });
}
