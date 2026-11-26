import { getEmDashCollection } from "emdash";
import { categoryLinks } from "../lib/catalog-links";
import { milfordDay } from "../lib/schedule-dates";
import { apply, backReady, normalize, statusOf, type TubAction, type Tubs } from "./tub-flow";

/**
 * Freezer tub counts, staff only. Stored in the plugin's own storage, keyed by flavor, so a
 * count never makes a revision or touches the site. The rules for moving tubs are in
 * tub-flow.ts. Every tap is a versioned compare-and-set (retried on a clash), so two people
 * tapping at once can't take a count below zero or lose a tap.
 */
export interface TubChange {
	at: string;
	text: string;
	by: string;
}

type Collection<T> = {
	getVersioned(id: string): Promise<{ value: T; revision: string } | null>;
	compareAndSet(id: string, expectedRevision: string | null, data: T): Promise<{ applied: boolean }>;
	getMany(ids: string[]): Promise<Map<string, T>>;
	put(id: string, data: T): Promise<void>;
	query(options: { orderBy?: Record<string, "asc" | "desc">; limit?: number }): Promise<{ items: Array<{ id: string; data: T }> }>;
};
interface Storage {
	tubs: Collection<Tubs>;
	tubLog: Collection<TubChange>;
}

/** Every flavor with its category and counts, A to Z, and the latest changes. */
export async function readTubs(storage: Storage) {
	const [{ entries: flavors }, { entries: categories }, links] = await Promise.all([
		getEmDashCollection("catalog_flavors", { limit: 500 }),
		getEmDashCollection("catalog_categories", { limit: 100 }),
		categoryLinks(),
	]);
	const categoryOf = new Map(links.map((link) => [link.entry, categories.find((c) => c.data.id === link.category)?.data.name ?? ""]));
	const counts = await storage.tubs.getMany(flavors.map((flavor) => flavor.data.id));
	const today = milfordDay(new Date())!;
	const rows = flavors
		.map((flavor) => {
			const tubs = normalize(counts.get(flavor.data.id));
			const { ready, tomorrow } = backReady(tubs, today);
			return {
				id: flavor.data.id as string,
				name: flavor.data.name as string,
				category: categoryOf.get(flavor.data.id) ?? "",
				back: tubs.back,
				ready,
				tomorrow,
				front: tubs.front,
				status: statusOf(tubs.front, ready, tomorrow),
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name, "en", { ignorePunctuation: true }) || a.category.localeCompare(b.category));
	const { items } = await storage.tubLog.query({ orderBy: { at: "desc" }, limit: 8 });
	return { rows, changes: items.map((item) => item.data) };
}

/** Applies one tap. Returns a notice when nothing changed (nothing to take, none ready yet). */
export async function changeTubs(storage: Storage, flavor: { id: string; name: string }, action: TubAction, by: string, count = 1) {
	for (let attempt = 0; attempt < 20; attempt++) {
		const stored = await storage.tubs.getVersioned(flavor.id);
		const now = new Date();
		const result = apply(normalize(stored?.value), action, flavor.name, now, count);
		if ("notice" in result) return result.notice;
		const { applied } = await storage.tubs.compareAndSet(flavor.id, stored?.revision ?? null, result.tubs);
		if (!applied) continue; // Someone else's tap landed first: start again from theirs.
		const at = now.toISOString();
		await storage.tubLog.put(`${at}-${Math.random().toString(36).slice(2, 8)}`, { at, text: result.text, by });
		return undefined;
	}
	return "Too many taps at once. Try again.";
}
