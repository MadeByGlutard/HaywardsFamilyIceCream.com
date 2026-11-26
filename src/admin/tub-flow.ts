/**
 * Tub counts as four plain numbers per flavor, in the order tubs move:
 * Freezing (just made, hardening) → Back freezer → Front freezer → Cabinets (the dipping case).
 * Staff move tubs on by hand; nothing here is timed. Pure functions (no EmDash imports) so
 * tests/tubs.test.mjs can run them with plain Node.
 */
import { milfordDay } from "../lib/schedule-dates.ts";

export const STAGES = ["freezing", "back", "front", "cabinets"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_NAMES: Record<Stage, string> = { freezing: "Freezing", back: "Back freezer", front: "Front freezer", cabinets: "Cabinets" };
export type Tubs = Record<Stage, number>;
export type TubAction = "add" | "remove" | "move" | "set";
export const ACTIONS: TubAction[] = ["add", "remove", "move", "set"];
/** Highest count anyone can type in. */
export const MAX_COUNT = 999;

export const nextStage = (stage: Stage): Stage | undefined => STAGES[STAGES.indexOf(stage) + 1];
export const isStage = (value: unknown): value is Stage => STAGES.includes(value as Stage);

/** Records from before the four counts: { front, back, batches?: [{ day, tubs }] }. */
interface OldTubs {
	front?: number;
	back?: number;
	batches?: Array<{ day: string; tubs: number }>;
}
export const isCurrent = (stored: unknown): stored is Tubs => typeof (stored as Tubs | null)?.freezing === "number";

/**
 * Brings a stored record up to the four counts. Old back-freezer tubs that went in on `today`
 * (a Milford day, YYYY-MM-DD) become Freezing, older ones stay in the Back freezer, the front
 * stays the Front freezer and Cabinets starts at 0.
 */
export function migrate(stored: unknown, today: string): Tubs {
	if (isCurrent(stored)) return { freezing: stored.freezing, back: stored.back ?? 0, front: stored.front ?? 0, cabinets: stored.cabinets ?? 0 };
	const old = (stored ?? {}) as OldTubs;
	const back = Math.max(0, old.back ?? 0);
	const freezing = Math.min(back, (old.batches ?? []).filter((b) => b.day === today).reduce((sum, b) => sum + Math.max(0, b.tubs), 0));
	return { freezing, back: back - freezing, front: Math.max(0, old.front ?? 0), cabinets: 0 };
}
export const migrateNow = (stored: unknown, now = new Date()) => migrate(stored, milfordDay(now)!);

/** The change log's line for a tap that went through. */
export function logLine(action: TubAction, name: string, stage: Stage, value?: number) {
	const where = STAGE_NAMES[stage];
	switch (action) {
		case "add":
			return `Added 1 ${name} to ${where}`;
		case "remove":
			return `Removed 1 ${name} from ${where}`;
		case "move":
			return `Moved 1 ${name} from ${where} to ${STAGE_NAMES[nextStage(stage)!]}`;
		case "set":
			return `Set ${name} ${where} to ${value}`;
	}
}
