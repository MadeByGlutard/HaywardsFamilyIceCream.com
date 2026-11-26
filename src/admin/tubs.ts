import { getEmDashCollection } from "emdash";
import { categoryLinks } from "../lib/catalog-links";
import { type Change, fromStored, isCurrent, logText, migrateNow, NEXT, type StoredTubs, toStored } from "./tub-flow";

/**
 * Freezer tub counts, staff only. Stored in the plugin's own storage, keyed by flavor, so a
 * count never makes a revision or touches the site. Every tap is one guarded update in a single
 * statement, so two people tapping at once can't take a count below zero.
 */
export interface TubChange {
	at: string;
	text: string;
	by: string;
}

type Update = { where: Record<string, unknown>; set?: Partial<StoredTubs>; delta?: Record<string, { inc: number } | { dec: number }> };
type Collection<T> = {
	getVersioned(id: string): Promise<{ value: T; revision: string } | null>;
	compareAndSet(id: string, expectedRevision: string | null, data: T): Promise<{ applied: boolean }>;
	updateIf(id: string, args: Update): Promise<{ applied: boolean; data?: T }>;
	getMany(ids: string[]): Promise<Map<string, T>>;
	put(id: string, data: T): Promise<void>;
	query(options: { orderBy?: Record<string, "asc" | "desc">; limit?: number }): Promise<{ items: Array<{ id: string; data: T }> }>;
};
interface Storage {
	tubs: Collection<StoredTubs>;
	tubLog: Collection<TubChange>;
}

/**
 * Makes sure the flavor's record exists in today's shape. Older records are converted once (see
 * migrate in tub-flow.ts); compare-and-set means a tap racing the conversion just re-reads.
 */
async function ensureCurrent(storage: Storage, id: string) {
	for (let attempt = 0; attempt < 10; attempt++) {
		const stored = await storage.tubs.getVersioned(id);
		if (stored && isCurrent(stored.value)) return fromStored(stored.value);
		const next = migrateNow(stored?.value);
		const { applied } = await storage.tubs.compareAndSet(id, stored?.revision ?? null, toStored(next));
		if (applied) return next;
	}
	throw new Error("Couldn’t read the counts. Try again.");
}

/** Every flavor with its category and counts, A to Z, and the latest changes. */
export async function readTubs(storage: Storage) {
	const [{ entries: flavors }, { entries: categories }, links] = await Promise.all([
		getEmDashCollection("catalog_flavors", { limit: 500 }),
		getEmDashCollection("catalog_categories", { limit: 100 }),
		categoryLinks(),
	]);
	const categoryOf = new Map(links.map((link) => [link.entry, categories.find((c) => c.data.id === link.category)?.data.name ?? ""]));
	const ids = flavors.map((flavor) => flavor.data.id as string);
	let counts = await storage.tubs.getMany(ids);
	const old = ids.filter((id) => counts.has(id) && !isCurrent(counts.get(id)));
	if (old.length) {
		await Promise.all(old.map((id) => ensureCurrent(storage, id)));
		counts = await storage.tubs.getMany(ids);
	}
	const rows = flavors
		.map((flavor) => ({
			id: flavor.data.id as string,
			name: flavor.data.name as string,
			category: categoryOf.get(flavor.data.id) ?? "",
			...migrateNow(counts.get(flavor.data.id)),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "en", { ignorePunctuation: true }) || a.category.localeCompare(b.category));
	const { items } = await storage.tubLog.query({ orderBy: { at: "desc" }, limit: 10 });
	return { rows, changes: items.map((item) => item.data) };
}

const inc = (n: number) => ({ inc: n });
const dec = (n: number) => ({ dec: n });

/** One guarded update for a change. Returns the change as it went through (with what undo needs), or null. */
async function apply(storage: Storage, id: string, change: Change): Promise<Change | null> {
	const update = async (args: Update) => (await storage.tubs.updateIf(id, args)).applied;
	switch (change.action) {
		case "move": {
			const to = NEXT[change.from];
			return (await update({ where: { [change.from]: { gte: 1 } }, delta: { [change.from]: dec(1), [to]: inc(1) } })) ? change : null;
		}
		case "into":
			// A fresh tub replaces the one in the slot, or fills an empty slot. Tried both ways, so
			// the log knows which happened even with someone else tapping at the same moment.
			for (let attempt = 0; attempt < 5; attempt++) {
				if (await update({ where: { front: { gte: 1 }, cab: 1 }, delta: { front: dec(1) } })) return { action: "into", swap: true };
				if (await update({ where: { front: { gte: 1 }, cab: 0 }, delta: { front: dec(1) }, set: { cab: 1 } })) return { action: "into", swap: false };
				const now = await storage.tubs.getVersioned(id);
				if (!now || now.value.front < 1) return null;
			}
			return null;
		case "usedUp":
			return (await update({ where: { cab: 1 }, set: { cab: 0 } })) ? change : null;
		case "batch":
			return (await update({ where: {}, delta: { hard: inc(change.count) } })) ? change : null;
		case "save": {
			// Setting counts by hand is last-write-wins: the sheet says what's there now.
			const before = (await storage.tubs.getVersioned(id))?.value;
			if (!before) return null;
			return (await update({ where: {}, set: toStored(change.to) })) ? { ...change, before: fromStored(before) } : null;
		}
	}
}

/** Undoes a change the page was told went through. Null when the tubs have moved on since. */
async function undo(storage: Storage, id: string, change: Change): Promise<boolean> {
	const update = async (args: Update) => (await storage.tubs.updateIf(id, args)).applied;
	switch (change.action) {
		case "move": {
			const to = NEXT[change.from];
			return update({ where: { [to]: { gte: 1 } }, delta: { [to]: dec(1), [change.from]: inc(1) } });
		}
		case "into":
			return change.swap ? update({ where: {}, delta: { front: inc(1) } }) : update({ where: {}, delta: { front: inc(1) }, set: { cab: 0 } });
		case "usedUp":
			return update({ where: {}, set: { cab: 1 } });
		case "batch":
			return update({ where: { hard: { gte: change.count } }, delta: { hard: dec(change.count) } });
		case "save":
			return change.before ? update({ where: {}, set: toStored(change.before) }) : false;
	}
}

async function log(storage: Storage, text: string, by: string) {
	const at = new Date().toISOString();
	await storage.tubLog.put(`${at}-${Math.random().toString(36).slice(2, 8)}`, { at, text, by });
}

/**
 * Applies one change, or undoes one. Returns the change as it went through, so the page can
 * offer Undo, or null when there was nothing to take.
 */
export async function changeTubs(storage: Storage, flavor: { id: string; name: string }, change: Change, by: string, isUndo = false) {
	await ensureCurrent(storage, flavor.id);
	if (isUndo) {
		if (!(await undo(storage, flavor.id, change))) return null;
		await log(storage, `Undid: ${logText(change, flavor.name)}`, by);
		return change;
	}
	const done = await apply(storage, flavor.id, change);
	if (done) await log(storage, logText(done, flavor.name), by);
	return done;
}
