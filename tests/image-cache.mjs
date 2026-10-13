import assert from 'node:assert/strict';
import { mkdtemp, readdir, utimes, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-image-cache-test-'));
const previousDirectory = process.env.IMAGE_CACHE_DIR;
process.env.IMAGE_CACHE_DIR = directory;
const { cachedImage } = await import('../src/lib/image-cache.ts');
const pause = () => new Promise(resolve => setTimeout(resolve, 40));
try {
  let downloads = 0;
  const first = Buffer.from('first image');
  const load = async () => { downloads++; await pause(); return { image: first }; };
  const responses = await Promise.all(Array.from({ length: 8 }, () => cachedImage('test', 'one-source', 10000, load)));
  assert.equal(downloads, 1, 'concurrent cold requests share one upstream load');
  for (const image of responses) assert.deepEqual(image, first);
  assert.deepEqual(await cachedImage('test', 'one-source', 10000, load), first);
  assert.equal(downloads, 1, 'fresh cache does not download again');

  const file = path.join(directory, 'test', (await readdir(path.join(directory, 'test')))[0]);
  const old = new Date(Date.now() - 60000);
  await utimes(file, old, old);
  const next = Buffer.from('refreshed image');
  let finishRefresh;
  const refreshGate = new Promise(resolve => { finishRefresh = resolve; });
  const refresh = async () => { downloads++; await refreshGate; return { image: next }; };
  const stale = await Promise.all(Array.from({ length: 8 }, () => cachedImage('test', 'one-source', 10000, refresh)));
  for (const image of stale) assert.deepEqual(image, first, 'stale copy stays available during refresh');
  assert.equal(downloads, 2, 'parallel stale requests start only one refresh');
  finishRefresh();
  for (let attempt = 0; attempt < 30; attempt++) {
    if ((await cachedImage('test', 'one-source', 10000, refresh)).equals(next)) break;
    await pause();
  }
  assert.deepEqual(await cachedImage('test', 'one-source', 10000, refresh), next);
  await utimes(file, old, old);
  assert.deepEqual(await cachedImage('test', 'one-source', 10000, async () => { throw new Error('offline'); }), next, 'failed refresh retains the cached image');
  await pause();

  let failures = 0;
  const failed = await Promise.allSettled(Array.from({ length: 8 }, () => cachedImage('test', 'retry-source', 10000, async () => {
    failures++; await pause(); throw new Error('offline');
  })));
  assert.equal(failures, 1);
  assert.ok(failed.every(result => result.status === 'rejected'));
  assert.deepEqual(await cachedImage('test', 'retry-source', 10000, load), first, 'failed cold load can be retried');
  assert.equal(downloads, 3);
  assert.ok((await readdir(path.join(directory, 'test'))).every(name => !name.endsWith('.tmp')), 'atomic writes leave no temporary files');
  console.log('PASS: concurrent cold loads, fresh cache, shared refresh, stale fallback, failure/retry, atomic writes.');
} finally {
  if (previousDirectory === undefined) delete process.env.IMAGE_CACHE_DIR;
  else process.env.IMAGE_CACHE_DIR = previousDirectory;
  await rm(directory, { recursive: true, force: true });
}
