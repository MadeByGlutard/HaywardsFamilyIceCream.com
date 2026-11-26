/**
 * Tub counts follow the tub: Hardening (just made) → Back freezer → Front freezer → Cabinets.
 * The first three are counts; Cabinets is yes or no, one tub per flavor in its slot. Pure
 * functions (no EmDash imports), so tests/tubs.test.mjs runs them with plain Node and the admin
 * page uses the same rules to show a tap before the server answers.
 */
import { milfordDay } from "../lib/schedule-dates.ts";

export const COUNTS = ["hard", "back", "front"] as const;
export type Count = (typeof COUNTS)[number];
/** A tub only moves one way; "Into cabinets" covers the last step. */
export type MoveFrom = "hard" | "back";
export const NEXT: Record<MoveFrom, Count> = { hard: "back", back: "front" };
/** Highest count anyone can set. */
export const MAX_COUNT = 999;

/** What a flavor has. Stored with `cab` as 1 or 0 so guarded updates can compare it as a number. */
export interface Tubs {
	hard: number;
	back: number;
	front: number;
	cab: boolean;
}
export interface StoredTubs {
	hard: number;
	back: number;
	front: number;
	cab: 0 | 1;
}
export const toStored = (t: Tubs): StoredTubs => ({ hard: t.hard, back: t.back, front: t.front, cab: t.cab ? 1 : 0 });
export const fromStored = (s: StoredTubs): Tubs => ({ hard: s.hard, back: s.back, front: s.front, cab: !!s.cab });
export const EMPTY: Tubs = { hard: 0, back: 0, front: 0, cab: false };
export const tubsInAll = (t: Tubs) => t.hard + t.back + t.front + (t.cab ? 1 : 0);

/**
 * One change, as the page sends it. `swap` and `before` are filled in by the server so it can be
 * undone. `count` is for repeated moves the page adds up under one Undo ("Moved 3 Chocolate…").
 */
export type Change =
	| { action: "move"; from: MoveFrom; count?: number }
	| { action: "into"; swap?: boolean; count?: number }
	| { action: "usedUp" }
	| { action: "batch"; count: number }
	| { action: "save"; to: Tubs; before?: Tubs };

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= MAX_COUNT;
const parseTubs = (t: unknown): Tubs | null => {
	const v = t as Tubs | null;
	return v && isCount(v.hard) && isCount(v.back) && isCount(v.front) && typeof v.cab === "boolean" ? { hard: v.hard, back: v.back, front: v.front, cab: v.cab } : null;
};
/** Checks a change from the page, keeping only the fields that belong to it. */
export function parseChange(input: unknown): Change | null {
	const c = input as Record<string, unknown> | null;
	if (c?.count !== undefined && !(isCount(c.count) && c.count >= 1)) return null;
	const count = c?.count !== undefined && c.count !== 1 ? { count: c.count as number } : {};
	switch (c?.action) {
		case "move":
			return c.from === "hard" || c.from === "back" ? { action: "move", from: c.from, ...count } : null;
		case "into":
			return { action: "into", ...(typeof c.swap === "boolean" && { swap: c.swap }), ...(c.swap === true && count) };
		case "usedUp":
			return { action: "usedUp" };
		case "batch":
			return isCount(c.count) && c.count >= 1 ? { action: "batch", count: c.count } : null;
		case "save": {
			const to = parseTubs(c.to);
			const before = c.before === undefined ? undefined : parseTubs(c.before);
			return to && before !== null ? { action: "save", to, ...(before && { before }) } : null;
		}
	}
	return null;
}

/** The change applied to counts, or null when there's nothing to take. Same rules as the guarded updates in tubs.ts. */
const times = (change: Change) => ("count" in change && change.count) || 1;

export function applyChange(t: Tubs, change: Change): Tubs | null {
	switch (change.action) {
		case "move":
			return t[change.from] >= 1 ? { ...t, [change.from]: t[change.from] - 1, [NEXT[change.from]]: t[NEXT[change.from]] + 1 } : null;
		case "into":
			return t.front >= 1 ? { ...t, front: t.front - 1, cab: true } : null;
		case "usedUp":
			return t.cab ? { ...t, cab: false } : null;
		case "batch":
			return { ...t, hard: t.hard + change.count };
		case "save":
			return { ...change.to };
	}
}
/** Undoing a change applied to counts, or null when the tubs have moved on since. */
export function undoChange(t: Tubs, change: Change): Tubs | null {
	switch (change.action) {
		case "move": {
			const to = NEXT[change.from];
			const n = times(change);
			return t[to] >= n ? { ...t, [to]: t[to] - n, [change.from]: t[change.from] + n } : null;
		}
		case "into":
			return { ...t, front: t.front + times(change), cab: change.swap ? t.cab : false };
		case "usedUp":
			return { ...t, cab: true };
		case "batch":
			return t.hard >= change.count ? { ...t, hard: t.hard - change.count } : null;
		case "save":
			return change.before ? { ...change.before } : null;
	}
}

const WHERE: Record<Count, string> = { hard: "Hardening", back: "the back freezer", front: "the front freezer" };
export const placeWords = (count: Count) => WHERE[count];
export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** What the snackbar and the change log say. */
export function changeText(change: Change, name: string) {
	switch (change.action) {
		case "move":
			return `Moved ${times(change)} ${name} to ${WHERE[NEXT[change.from]]}`;
		case "into":
			if (!change.swap) return `${name} is in the cabinets`;
			return times(change) > 1 ? `Swapped ${times(change)} fresh ${name} into the cabinets` : `Fresh ${name} into the cabinets`;
		case "usedUp":
			return `${name} used up, its slot is empty`;
		case "batch":
			return `Made ${change.count} ${name}, into Hardening`;
		case "save":
			return `Updated ${name}`;
	}
}
/** Changes that add up when repeated: the same move of the same flavor, or another swap. */
export const repeatKey = (change: Change) =>
	change.action === "move" ? `move:${change.from}` : change.action === "into" && change.swap ? "swap" : null;
/** How long repeats add up, and how long Undo stays on screen. */
export const UNDO_MS = 8000;

/** The change log keeps what a saved sheet set the counts to. */
export function logText(change: Change, name: string) {
	if (change.action !== "save") return changeText(change, name);
	const t = change.to;
	return `Updated ${name}: ${t.hard} hardening, ${t.back} back, ${t.front} front, ${t.cab ? "in the cabinets" : "not in the cabinets"}`;
}

/**
 * Brings any stored record up to today's shape:
 * - { freezing, back, front, cabinets } (the four-count sheet): freezing → Hardening, any cabinets → in.
 * - { front, back, batches? } (before that): back-freezer tubs that went in on `today` (a Milford
 *   day, YYYY-MM-DD) are still Hardening, older ones stay in the back.
 */
export function migrate(stored: unknown, today: string): Tubs {
	const s = (stored ?? {}) as Record<string, unknown>;
	const n = (v: unknown) => (typeof v === "number" && v > 0 ? Math.trunc(v) : 0);
	if (typeof s.hard === "number") return { hard: n(s.hard), back: n(s.back), front: n(s.front), cab: !!s.cab };
	if (typeof s.freezing === "number") return { hard: n(s.freezing), back: n(s.back), front: n(s.front), cab: n(s.cabinets) > 0 };
	const back = n(s.back);
	const batches = Array.isArray(s.batches) ? (s.batches as Array<{ day?: string; tubs?: number }>) : [];
	const hard = Math.min(back, batches.filter((b) => b.day === today).reduce((sum, b) => sum + n(b.tubs), 0));
	return { hard, back: back - hard, front: n(s.front), cab: false };
}
/** Stored exactly as today's shape, with nothing extra. */
export const isCurrent = (stored: unknown): stored is StoredTubs => {
	const s = stored as Record<string, unknown> | null;
	return !!s && Object.keys(s).length === 4 && typeof s.hard === "number" && typeof s.back === "number" && typeof s.front === "number" && (s.cab === 0 || s.cab === 1);
};
export const migrateNow = (stored: unknown, now = new Date()) => migrate(stored, milfordDay(now)!);
