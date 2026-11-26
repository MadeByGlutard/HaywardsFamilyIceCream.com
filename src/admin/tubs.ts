import { getEmDashCollection } from "emdash";
import { categoryLinks } from "../lib/catalog-links";
import { isCurrent, logLine, MAX_COUNT, migrateNow, nextStage, type Stage, type TubAction, type Tubs } from "./tub-flow";

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

type Collection<T> = {
	getVersioned(id: string): Promise<{ value: T; revision: string } | null>;
	compareAndSet(id: string, expectedRevision: string | null, data: T): Promise<{ applied: boolean }>;
	updateIf(id: string, args: { where: Record<string, unknown>; set?: Partial<T>; delta?: Record<string, unknown> }): Promise<{ applied: boolean; data?: T }>;
	getMany(ids: string[]): Promise<Map<string, T>>;
	put(id: string, data: T): Promise<void>;
	query(options: { orderBy?: Record<string, "asc" | "desc">; limit?: number }): Promise<{ items: Array<{ id: string; data: T }> }>;
};
interface Storage {
	tubs: Collection<Tubs>;
	tubLog: Collection<TubChange>;
}

/**
 * Makes sure the flavor's record exists in the four-count shape. Older records are converted
 * once (see migrate in tub-flow.ts); compare-and-set means a tap racing the conversion just
 * re-reads.
 */
async function ensureCurrent(storage: Storage, id: string) {
	for (let attempt = 0; attempt < 10; attempt++) {
		const stored = await storage.tubs.getVersioned(id);
		if (stored && isCurrent(stored.value)) return;
		const { applied } = await storage.tubs.compareAndSet(id, stored?.revision ?? null, migrateNow(stored?.value));
		if (applied) return;
	}
}

/** Every flavor with its category and four counts, A to Z, and the latest changes. */
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

/** Applies one tap. Returns false when there was nothing to take. */
export async function changeTubs(storage: Storage, flavor: { id: string; name: string }, action: TubAction, stage: Stage, by: string, value?: number) {
	await ensureCurrent(storage, flavor.id);
	const update = (args: { where: Record<string, unknown>; set?: Partial<Tubs>; delta?: Record<string, unknown> }) => storage.tubs.updateIf(flavor.id, args);
	let result: { applied: boolean };
	let count: number | undefined;
	switch (action) {
		case "add":
			result = await update({ where: {}, delta: { [stage]: { inc: 1 } } });
			break;
		case "remove":
			result = await update({ where: { [stage]: { gte: 1 } }, delta: { [stage]: { dec: 1 } } });
			break;
		case "move": {
			const to = nextStage(stage);
			if (!to) return false;
			result = await update({ where: { [stage]: { gte: 1 } }, delta: { [stage]: { dec: 1 }, [to]: { inc: 1 } } });
			break;
		}
		case "set":
			count = Math.trunc(Number(value));
			if (!(count >= 0 && count <= MAX_COUNT)) return false;
			result = await update({ where: {}, set: { [stage]: count } });
			break;
	}
	if (!result.applied) return false;
	const at = new Date().toISOString();
	await storage.tubLog.put(`${at}-${Math.random().toString(36).slice(2, 8)}`, { at, text: logLine(action, flavor.name, stage, count), by });
	return true;
}
