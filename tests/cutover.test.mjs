import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resetIsCurrent, sessionIsCurrent } from '../src/auth/password/current.ts';
import { seedPeriodInForce } from '../src/lib/schedule-dates.ts';

const seed = JSON.parse(await readFile(new URL('../seed/seed.json', import.meta.url), 'utf8'));

test('moving the old banner picks the period in force and skips undated drafts', () => {
  // The seed's Summer draft has no start date; it used to make the production upgrade throw.
  assert.ok(seed.content.schedule.some((p) => !p.data.start_date));
  assert.doesNotThrow(() => seedPeriodInForce(seed.content.schedule, '2026-11-26'));
  assert.equal(seedPeriodInForce(seed.content.schedule, '2026-11-26')?.slug, 'thanksgiving-2026');
  assert.equal(seedPeriodInForce(seed.content.schedule, '2026-12-01')?.slug, 'trees-2026');
  assert.equal(seedPeriodInForce(seed.content.schedule, '2025-01-01'), undefined);
  const entries = [
    { status: 'draft', data: { start_date: '2026-01-01T05:00:00.000Z' } },
    { status: 'published', data: { start_date: '' } },
    { status: 'published', data: { start_date: 'not a date' } },
  ];
  assert.equal(seedPeriodInForce(entries, '2026-06-01'), undefined);
});

test('a password change ends sessions that began under the old password', () => {
  assert.equal(sessionIsCurrent({ id: 'u', since: 'A' }, 'A'), true);
  assert.equal(sessionIsCurrent({ id: 'u', since: 'A' }, 'B'), false);
  assert.equal(sessionIsCurrent({ id: 'u' }, 'A'), false, 'sessions from before this check sign in again');
  assert.equal(sessionIsCurrent({ id: 'u', since: 'A' }, undefined), true, 'no password on record: nothing to compare');
  assert.equal(sessionIsCurrent(undefined, 'A'), true);
});

test('only the newest reset link works, once, before the password changes', () => {
  const now = 1_000_000;
  const link = { userId: 'u', expiresAt: now + 10, issuedAt: 5, credentialAt: 'A' };
  assert.equal(resetIsCurrent(link, 'A', 5, now), true);
  assert.equal(resetIsCurrent(link, 'A', 6, now), false, 'a newer link replaced it');
  assert.equal(resetIsCurrent(link, 'B', 5, now), false, 'the password changed since');
  assert.equal(resetIsCurrent({ ...link, expiresAt: now - 1 }, 'A', 5, now), false, 'expired');
  assert.equal(resetIsCurrent({ userId: 'u', expiresAt: now + 10 }, 'A', undefined, now), false, 'links from before this check');
  assert.equal(resetIsCurrent({ ...link, credentialAt: null }, undefined, 5, now), true, 'no password yet');
});
