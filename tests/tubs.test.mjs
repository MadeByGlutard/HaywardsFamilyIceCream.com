import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, logLine, nextStage, isCurrent, STAGES } from '../src/admin/tub-flow.ts';

test('the four counts run in the order tubs move', () => {
	assert.deepEqual(STAGES, ['freezing', 'back', 'front', 'cabinets']);
	assert.equal(nextStage('freezing'), 'back');
	assert.equal(nextStage('front'), 'cabinets');
	assert.equal(nextStage('cabinets'), undefined);
});

test('old records: back tubs added today become Freezing, older stay in the back', () => {
	const old = { front: 2, back: 6, batches: [{ day: '2026-11-25', at: '', tubs: 4 }, { day: '2026-11-26', at: '', tubs: 2 }] };
	assert.deepEqual(migrate(old, '2026-11-26'), { freezing: 2, back: 4, front: 2, cabinets: 0 });
	assert.deepEqual(migrate(old, '2026-11-27'), { freezing: 0, back: 6, front: 2, cabinets: 0 });
	// The first version had no batches at all.
	assert.deepEqual(migrate({ front: 1, back: 3 }, '2026-11-26'), { freezing: 0, back: 3, front: 1, cabinets: 0 });
	assert.deepEqual(migrate(null, '2026-11-26'), { freezing: 0, back: 0, front: 0, cabinets: 0 });
	assert.equal(isCurrent(old), false);
});

test('current records pass through without old fields', () => {
	const now = { freezing: 1, back: 2, front: 3, cabinets: 4 };
	assert.ok(isCurrent(now));
	assert.deepEqual(migrate({ ...now, batches: [] }, '2026-11-26'), now);
});

test('the change log reads in plain words', () => {
	assert.equal(logLine('move', 'Maple Walnut', 'back'), 'Moved 1 Maple Walnut from Back freezer to Front freezer');
	assert.equal(logLine('set', 'Pistachio', 'cabinets', 2), 'Set Pistachio Cabinets to 2');
	assert.equal(logLine('add', 'Vanilla', 'freezing'), 'Added 1 Vanilla to Freezing');
	assert.equal(logLine('remove', 'Vanilla', 'front'), 'Removed 1 Vanilla from Front freezer');
});
