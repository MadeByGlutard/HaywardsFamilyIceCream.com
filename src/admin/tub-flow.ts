/**
 * How tubs move at the stand, as pure functions (no EmDash imports) so tests/tubs.test.mjs can
 * run them with plain Node: made → back freezer → front freezer → dipping case.
 *
 * A "day" is a calendar day in Milford (America/New_York). Tubs that go into the back freezer
 * on one day are ready to move to the front from midnight starting the next day. Nothing else
 * (hours, a minimum time) is assumed.
 */
import { milfordDay } from "../lib/schedule-dates.ts";

/** One or more tubs that went into the back freezer on the same Milford day. */
export interface Batch {
	/** Milford day they went in, YYYY-MM-DD. "" for tubs counted before days were kept: ready. */
	day: string;
	/** When the first of them went in (ISO), "" if unknown. */
	at: string;
	tubs: number;
}
/** Stored per flavor. `back` always equals the sum of `batches`. */
export interface Tubs {
	front: number;
	back: number;
	batches: Batch[];
}
export type TubAction = "back+" | "back-" | "move" | "front+" | "front-" | "case" | "last";
export const ACTIONS: TubAction[] = ["back+", "back-", "move", "front+", "front-", "case", "last"];
/** Most tubs one "made" tap can add. */
export const MAX_BATCH = 50;

/** Fills in what older records lack: a back count without batches is all ready. */
export function normalize(stored: Partial<Tubs> | null | undefined): Tubs {
	const front = Math.max(0, stored?.front ?? 0);
	const batches = (stored?.batches ?? []).filter((b) => b.tubs > 0).map((b) => ({ ...b }));
	const counted = batches.reduce((sum, b) => sum + b.tubs, 0);
	const back = Math.max(0, stored?.back ?? counted);
	if (back > counted) batches.unshift({ day: "", at: "", tubs: back - counted });
	batches.sort((a, b) => a.day.localeCompare(b.day) || a.at.localeCompare(b.at));
	return { front, back: batches.reduce((sum, b) => sum + b.tubs, 0), batches };
}

/** Back tubs ready to move now, and those that went in today (ready tomorrow). */
export function backReady(tubs: Tubs, today: string) {
	let ready = 0;
	let tomorrow = 0;
	for (const b of tubs.batches) b.day < today ? (ready += b.tubs) : (tomorrow += b.tubs);
	return { ready, tomorrow };
}

export type Status = "Back, ready tomorrow" | "Move from back" | "In front" | "Last one in front" | "Out";
export function statusOf(front: number, ready: number, tomorrow: number): Status {
	if (front > 1) return "In front";
	if (front === 1) return "Last one in front";
	if (ready > 0) return "Move from back";
	if (tomorrow > 0) return "Back, ready tomorrow";
	return "Out";
}

/**
 * The new counts after one tap, and the log line, or a `notice` saying why nothing changed.
 * `now` is when the tap happened; `count` is only used by "back+".
 */
export function apply(current: Tubs, action: TubAction, name: string, now: Date, count = 1): { tubs: Tubs; text: string } | { notice: string } {
	const today = milfordDay(now)!;
	const tubs = normalize(current);
	const plural = (n: number) => `${n} ${name}`;
	switch (action) {
		case "back+": {
			const n = Math.trunc(count);
			if (!(n >= 1 && n <= MAX_BATCH)) return { notice: `Add 1 to ${MAX_BATCH} tubs at a time.` };
			const same = tubs.batches.find((b) => b.day === today);
			if (same) same.tubs += n;
			else tubs.batches.push({ day: today, at: now.toISOString(), tubs: n });
			tubs.back += n;
			return { tubs, text: `${plural(n)} made, into the back (ready tomorrow)` };
		}
		case "back-": {
			// A correction, so it takes the newest tubs first.
			const newest = tubs.batches.at(-1);
			if (!newest) return { notice: `No ${name} in the back freezer.` };
			newest.tubs -= 1;
			tubs.batches = tubs.batches.filter((b) => b.tubs > 0);
			tubs.back -= 1;
			return { tubs, text: `1 ${name} taken off the back count` };
		}
		case "move": {
			// Oldest ready tubs first.
			const oldest = tubs.batches[0];
			if (!oldest) return { notice: `No ${name} in the back freezer.` };
			if (oldest.day >= today) return { notice: `${name} in the back went in today. Ready to move tomorrow.` };
			oldest.tubs -= 1;
			tubs.batches = tubs.batches.filter((b) => b.tubs > 0);
			tubs.back -= 1;
			tubs.front += 1;
			return { tubs, text: `1 ${name} moved from the back to the front` };
		}
		case "front+":
			tubs.front += 1;
			return { tubs, text: `1 ${name} added to the front count` };
		case "front-":
			if (tubs.front < 1) return { notice: `No ${name} in the front freezer.` };
			tubs.front -= 1;
			return { tubs, text: `1 ${name} taken off the front count` };
		case "case":
			if (tubs.front < 1) return { notice: `No ${name} in the front freezer. Move one from the back first.` };
			tubs.front -= 1;
			return { tubs, text: tubs.front === 0 ? `Last ${name} from the front, into the case` : `1 ${name} from the front, into the case` };
		case "last": {
			if (tubs.front < 1) return { notice: `The front is already out of ${name}.` };
			const was = tubs.front;
			tubs.front = 0;
			return { tubs, text: `Last ${name} out of the front${was > 1 ? ` (count was ${was})` : ""}` };
		}
	}
}
