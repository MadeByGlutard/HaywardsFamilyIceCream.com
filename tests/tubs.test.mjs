import test from 'node:test';
import assert from 'node:assert/strict';
import { migrate, isCurrent, applyChange, undoChange, parseChange, changeText, logText, toStored, NEXT } from '../src/admin/tub-flow.ts';

const tubs = (hard, back, front, cab) => ({ hard, back, front, cab });

test('a tub moves one way: Hardening → Back freezer → Front freezer', () => {
	assert.deepEqual(NEXT, { hard: 'back', back: 'front' });
	assert.deepEqual(applyChange(tubs(2, 0, 0, false), { action: 'move', from: 'hard' }), tubs(1, 1, 0, false));
	assert.deepEqual(applyChange(tubs(0, 1, 0, false), { action: 'move', from: 'back' }), tubs(0, 0, 1, false));
	assert.equal(applyChange(tubs(0, 0, 3, false), { action: 'move', from: 'back' }), null);
});

test('Into cabinets fills the slot or swaps a fresh tub in; Used up empties it', () => {
	assert.deepEqual(applyChange(tubs(0, 0, 2, false), { action: 'into' }), tubs(0, 0, 1, true));
	assert.deepEqual(applyChange(tubs(0, 0, 2, true), { action: 'into' }), tubs(0, 0, 1, true));
	assert.equal(applyChange(tubs(0, 0, 0, true), { action: 'into' }), null);
	assert.deepEqual(applyChange(tubs(0, 0, 0, true), { action: 'usedUp' }), tubs(0, 0, 0, false));
	assert.equal(applyChange(tubs(0, 0, 0, false), { action: 'usedUp' }), null);
});

test('every change can be undone, unless the tubs moved on', () => {
	const t = tubs(3, 1, 1, true);
	for (const c of [{ action: 'move', from: 'hard' }, { action: 'move', from: 'back' }, { action: 'usedUp' }, { action: 'batch', count: 4 }]) {
		assert.deepEqual(undoChange(applyChange(t, c), c), t, c.action);
	}
	assert.deepEqual(undoChange(applyChange(t, { action: 'into' }), { action: 'into', swap: true }), t);
	const empty = tubs(0, 0, 1, false);
	assert.deepEqual(undoChange(applyChange(empty, { action: 'into' }), { action: 'into', swap: false }), empty);
	assert.deepEqual(undoChange(tubs(9, 9, 9, false), { action: 'save', to: tubs(9, 9, 9, false), before: t }), t);
	assert.equal(undoChange(tubs(1, 0, 0, false), { action: 'batch', count: 4 }), null);
});

test('changes from the page are checked', () => {
	assert.deepEqual(parseChange({ action: 'move', from: 'hard', extra: 1 }), { action: 'move', from: 'hard' });
	assert.equal(parseChange({ action: 'move', from: 'front' }), null);
	assert.equal(parseChange({ action: 'batch', count: 0 }), null);
	assert.equal(parseChange({ action: 'batch', count: 1000 }), null);
	assert.equal(parseChange({ action: 'save', to: { hard: -1, back: 0, front: 0, cab: false } }), null);
	assert.equal(parseChange({ action: 'save', to: { hard: 1, back: 0, front: 0, cab: 'yes' } }), null);
	assert.equal(parseChange({ action: 'set' }), null);
});

test('migration: the four-count sheet and the first version both come over', () => {
	assert.deepEqual(migrate({ freezing: 2, back: 3, front: 1, cabinets: 2 }, '2026-11-26'), tubs(2, 3, 1, true));
	assert.deepEqual(migrate({ freezing: 0, back: 0, front: 4, cabinets: 0 }, '2026-11-26'), tubs(0, 0, 4, false));
	const old = { front: 2, back: 6, batches: [{ day: '2026-11-25', tubs: 4 }, { day: '2026-11-26', tubs: 2 }] };
	assert.deepEqual(migrate(old, '2026-11-26'), tubs(2, 4, 2, false));
	assert.deepEqual(migrate({ front: 1, back: 3 }, '2026-11-26'), tubs(0, 3, 1, false));
	assert.deepEqual(migrate(null, '2026-11-26'), tubs(0, 0, 0, false));
	assert.ok(isCurrent(toStored(tubs(1, 2, 3, true))));
	assert.equal(isCurrent({ freezing: 1, back: 0, front: 0, cabinets: 0 }), false);
	assert.equal(isCurrent({ ...toStored(tubs(1, 2, 3, true)), batches: [] }), false);
});

test('the snackbar and log read in plain words', () => {
	assert.equal(changeText({ action: 'move', from: 'back' }, 'Pistachio'), 'Moved 1 Pistachio to the front freezer');
	assert.equal(changeText({ action: 'move', from: 'hard' }, 'Coffee'), 'Moved 1 Coffee to the back freezer');
	assert.equal(changeText({ action: 'into', swap: true }, 'Coffee'), 'Fresh Coffee into the cabinets');
	assert.equal(changeText({ action: 'into', swap: false }, 'Coffee'), 'Coffee is in the cabinets');
	assert.equal(changeText({ action: 'usedUp' }, 'Coffee'), 'Coffee used up, the slot is empty');
	assert.equal(changeText({ action: 'batch', count: 3 }, 'Coffee'), 'Made 3 Coffee, into Hardening');
	assert.equal(changeText({ action: 'save', to: tubs(1, 2, 0, true) }, 'Coffee'), 'Updated Coffee');
	assert.equal(logText({ action: 'save', to: tubs(1, 2, 0, true) }, 'Coffee'), 'Updated Coffee: 1 hardening, 2 back, 0 front, in the cabinets');
});
