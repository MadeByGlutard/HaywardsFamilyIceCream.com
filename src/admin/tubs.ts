import { getEmDashCollection } from "emdash";
import { categoryLinks } from "../lib/catalog-links";

/**
 * Freezer tub counts, staff only. Stored in the plugin's own storage, keyed by flavor, so a
 * count never makes a revision or touches the site. Every change is one guarded update, so two
 * people tapping at once can't take a count below zero.
 */
export interface Tubs {
	front: number;
	back: number;
}
export interface TubChange {
	at: string;
	text: string;
	by: string;
}
export type TubAction = "front+" | "front-" | "back+" | "back-" | "case" | "move";

type Collection<T> = {
	get(id: string): Promise<T | null>;
	compareAndSet(id: string, expected: string | null, data: T): Promise<unknown>;
	updateIf(id: string, args: { where: Record<string, unknown>; delta?: Record<string, unknown> }): Promise<{ applied: boolean; data?: T }>;
	getMany(ids: string[]): Promise<Map<string, T>>;
	put(id: string, data: T): Promise<void>;
	query(options: { orderBy?: Record<string, "asc" | "desc">; limit?: number }): Promise<{ items: Array<{ id: string; data: T }> }>;
};
interface Storage {
	tubs: Collection<Tubs>;
	tubLog: Collection<TubChange>;
}

const inc = { inc: 1 };
const dec = { dec: 1 };

/** Every flavor with its category and counts, A to Z, and the latest changes. */
export async function readTubs(storage: Storage) {
	const [{ entries: flavors }, { entries: categories }, links] = await Promise.all([
		getEmDashCollection("catalog_flavors", { limit: 500 }),
		getEmDashCollection("catalog_categories", { limit: 100 }),
		categoryLinks(),
	]);
	const categoryOf = new Map(links.map((link) => [link.entry, categories.find((c) => c.data.id === link.category)?.data.name ?? ""]));
	const counts = await storage.tubs.getMany(flavors.map((flavor) => flavor.data.id));
	const rows = flavors
		.map((flavor) => ({
			id: flavor.data.id as string,
			name: flavor.data.name as string,
			category: categoryOf.get(flavor.data.id) ?? "",
			front: counts.get(flavor.data.id)?.front ?? 0,
			back: counts.get(flavor.data.id)?.back ?? 0,
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "en", { ignorePunctuation: true }) || a.category.localeCompare(b.category));
	const { items } = await storage.tubLog.query({ orderBy: { at: "desc" }, limit: 8 });
	return { rows, changes: items.map((item) => item.data) };
}

/** Applies one tap. Returns the new counts, or undefined if there was nothing to take. */
export async function changeTubs(storage: Storage, flavor: { id: string; name: string }, action: TubAction, by: string) {
	if (!(await storage.tubs.get(flavor.id))) await storage.tubs.compareAndSet(flavor.id, null, { front: 0, back: 0 });
	const update = (where: Record<string, unknown>, delta: Record<string, unknown>) => storage.tubs.updateIf(flavor.id, { where, delta });
	let result: { applied: boolean; data?: Tubs } = { applied: false };
	let text = "";
	switch (action) {
		case "front+":
		case "back+": {
			const where = action === "front+" ? "front" : "back";
			result = await update({}, { [where]: inc });
			text = `Added 1 ${flavor.name} (${where})`;
			break;
		}
		case "front-":
		case "back-": {
			const where = action === "front-" ? "front" : "back";
			result = await update({ [where]: { gte: 1 } }, { [where]: dec });
			text = `Removed 1 ${flavor.name} (${where})`;
			break;
		}
		case "move":
			result = await update({ back: { gte: 1 } }, { back: dec, front: inc });
			text = `Moved 1 ${flavor.name} to the front`;
			break;
		case "case":
			// From the front freezer, or straight from the back if the front is empty.
			result = await update({ front: { gte: 1 } }, { front: dec });
			text = `1 ${flavor.name} into the case`;
			if (!result.applied) {
				result = await update({ back: { gte: 1 } }, { back: dec });
				text = `1 ${flavor.name} into the case (from the back)`;
			}
			break;
	}
	if (!result.applied) return undefined;
	const at = new Date().toISOString();
	await storage.tubLog.put(`${at}-${Math.random().toString(36).slice(2, 8)}`, { at, text, by });
	return result.data;
}
