import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, backReady, normalize, statusOf } from '../src/admin/tub-flow.ts';

// 10am and 11:30pm in Milford on Nov 26, and 12:05am on Nov 27 in Milford.
const nov26 = new Date('2026-11-26T15:00:00Z');
const nov26late = new Date('2026-11-27T04:30:00Z');
const nov27 = new Date('2026-11-27T05:05:00Z');
const run = (tubs, steps) => steps.reduce((t, [action, at, n]) => { const r = apply(t, action, 'Vanilla', at, n); assert.ok('tubs' in r, r.notice); return r.tubs; }, tubs);

test('older records without batches: back tubs are ready', () => {
	const t = normalize({ front: 2, back: 3 });
	assert.deepEqual(backReady(t, '2026-11-26'), { ready: 3, tomorrow: 0 });
	assert.equal(statusOf(0, 3, 0), 'Move from back');
});

test('tubs made today wait until the next Milford day', () => {
	let t = run(normalize(null), [['back+', nov26, 5], ['back+', nov26late, 2]]);
	assert.equal(t.back, 7);
	assert.equal(t.batches.length, 1, '11:30pm in Milford is still the 26th');
	assert.deepEqual(backReady(t, '2026-11-26'), { ready: 0, tomorrow: 7 });
	assert.match(apply(t, 'move', 'Vanilla', nov26late).notice, /tomorrow/);
	assert.deepEqual(backReady(t, '2026-11-27'), { ready: 7, tomorrow: 0 });
	t = run(t, [['move', nov27]]);
	assert.deepEqual([t.back, t.front], [6, 1]);
});

test('back to front takes the oldest ready tubs first', () => {
	let t = run(normalize(null), [['back+', nov26, 1], ['back+', nov27, 3]]);
	t = run(t, [['move', nov27]]);
	assert.deepEqual(t.batches.map((b) => [b.day, b.tubs]), [['2026-11-27', 3]]);
	assert.ok('notice' in apply(t, 'move', 'Vanilla', nov27));
});

test('into the case and last one out of the front', () => {
	let t = normalize({ front: 3, back: 0 });
	t = run(t, [['case', nov26]]);
	assert.equal(t.front, 2);
	const last = apply(t, 'last', 'Vanilla', nov26);
	assert.equal(last.tubs.front, 0);
	assert.match(last.text, /count was 2/);
	assert.ok('notice' in apply(last.tubs, 'case', 'Vanilla', nov26), 'the case only takes from the front');
	assert.equal(statusOf(0, 0, 0), 'Out');
	assert.equal(statusOf(0, 0, 4), 'Back, ready tomorrow');
	assert.equal(statusOf(1, 0, 0), 'Last one in front');
});

test('counts never go below zero and batch sizes are bounded', () => {
	const t = normalize(null);
	for (const action of ['back-', 'move', 'front-', 'case', 'last']) assert.ok('notice' in apply(t, action, 'Vanilla', nov26));
	assert.ok('notice' in apply(t, 'back+', 'Vanilla', nov26, 0));
	assert.ok('notice' in apply(t, 'back+', 'Vanilla', nov26, 500));
	const back = run(t, [['back+', nov26, 2], ['back-', nov26]]);
	assert.equal(back.back, 1);
});
