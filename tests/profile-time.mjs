import assert from 'node:assert/strict';
import { profileClock } from '../src/lib/profile-time.ts';
import { locationTimezone } from '../src/lib/location-timezone.ts';

const winter = new Date('2026-01-15T12:00:00Z');
const summer = new Date('2026-07-15T12:00:00Z');
assert.equal(profileClock('Asia/Dubai', 'Asia/Dubai', winter).difference, 'same time');
assert.equal(profileClock('Asia/Dubai', 'America/New_York', winter).difference, '9h ahead');
assert.equal(profileClock('Asia/Dubai', 'America/New_York', summer).difference, '8h ahead');
assert.equal(profileClock('Asia/Dubai', 'Asia/Kolkata', winter).difference, '1h 30m behind');
assert.equal(profileClock('Asia/Kathmandu', 'Asia/Kolkata', winter).difference, '15m ahead');
assert.equal(profileClock('Pacific/Auckland', 'Pacific/Honolulu', winter).difference, '23h ahead');
assert.equal(profileClock('Asia/Dubai', 'UTC', winter).time, '04:00 PM');
assert.match(profileClock('Asia/Dubai', 'UTC', winter).zone, /UTC\+04:00/);

const realFetch = globalThis.fetch;
let calls = 0;
globalThis.fetch = async url => {
  calls++;
  assert.match(String(url), /name=Dubai%2C\+United\+Arab\+Emirates/);
  return Response.json({ results: [{ timezone: 'Asia/Dubai' }] });
};
try {
  assert.equal(await locationTimezone('Dubai, United Arab Emirates'), 'Asia/Dubai');
  assert.equal(await locationTimezone('Dubai, United Arab Emirates'), 'Asia/Dubai');
  assert.equal(calls, 1, 'lookup is cached');
  assert.equal(await locationTimezone('Dubai, United Arab Emirates', 'Europe/London'), 'Europe/London');
  assert.equal(calls, 1, 'override skips geocoding');
  assert.equal(await locationTimezone(undefined, 'Invalid/Zone'), undefined);
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await locationTimezone('Unknown City'), undefined, 'failure must not fabricate a clock');
} finally { globalThis.fetch = realFetch; }
console.log('PASS: DST, fractional differences, midnight boundaries, location lookup, cache, override and failure handling.');
