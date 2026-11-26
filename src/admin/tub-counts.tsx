import * as React from "react";
import { applyChange, type Change, changeText, MAX_COUNT, NEXT, placeWords, repeatKey, type Tubs, UNDO_MS, undoChange } from "./tub-flow";

/**
 * Tub counts, built around where a tub is. On a phone: pick a place, see the flavors there, and
 * tap the one next move. Each flavor's sheet sets all its counts at once. On a wide screen the
 * A–Z overview sits beside it. Every change shows at once and can be undone for 8 seconds;
 * repeating the same move adds up under one Undo.
 */
type Place = "hard" | "back" | "front" | "cab";
interface Row extends Tubs {
	id: string;
	name: string;
	category: string;
}
interface LogEntry {
	at: string;
	text: string;
	by: string;
}
interface Reply {
	rows: Row[];
	changes: LogEntry[];
	done?: { text: string; change: Change } | null;
	failed?: string;
}
type Sheet = { kind: "flavor"; id: string; from: HTMLElement | null } | { kind: "batch"; from: HTMLElement | null } | null;
interface Snack {
	id: number;
	text: string;
	/** A note (nothing to move, couldn't undo) has no Undo. */
	note?: boolean;
}
/** Taps shown under one Undo: what they were, how many, and what the server said went through. */
interface Group {
	flavor: string;
	shown: Change;
	n: number;
	ok: number;
	server: Change | null;
}

const PLACES: Array<[Place, string, string]> = [["hard", "Hardening", "Hardening"], ["back", "Back", "Back freezer"], ["front", "Front", "Front freezer"], ["cab", "Cabinets", "Cabinets"]];
const HERE: Record<Place, string> = { hard: "In Hardening", back: "In the back freezer", front: "In the front freezer", cab: "In the cabinets" };
const EMPTY_TITLE: Record<Place, string> = { hard: "Nothing in Hardening", back: "The back freezer is empty", front: "The front freezer is empty", cab: "Nothing in the cabinets" };
const EMPTY_HINT: Record<Place, string> = {
	hard: "Tap Made a batch when tubs come off the machine.",
	back: "Move tubs here from Hardening.",
	front: "Move tubs here from the back freezer.",
	cab: "Move one up from the front freezer.",
};
const URL = "/_emdash/api/plugins/haywards-admin/tubs";
const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };
const has = (r: Row, p: Place) => (p === "cab" ? r.cab : r[p] > 0);
const whole = (v: string, min: number) => (/^\d+$/.test(v.trim()) && +v >= min && +v <= MAX_COUNT ? +v : null);

/** Times in Milford, wherever the phone thinks it is. */
const zone = { timeZone: "America/New_York" } as const;
const when = (at: string) => {
	const d = new Date(at);
	const day = (x: Date) => x.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
	const time = d.toLocaleTimeString("en-US", { ...zone, hour: "numeric", minute: "2-digit" });
	return day(new Date()) === day(d) ? `Today ${time}` : `${day(d)}, ${time}`;
};

const SearchIcon = () => (
	<svg viewBox="0 0 16 16" fill="none" strokeWidth="1.8" aria-hidden="true">
		<circle cx="7" cy="7" r="5" />
		<path d="m11 11 3.5 3.5" />
	</svg>
);

// Sizes, wording and states follow the approved mockup, with its light and dark palettes (text at
// 4.5:1 or better). The page background is the admin's own, so it sits in the admin like its pages.
const css = `
.tc { --tc-bg: var(--color-kumo-elevated); --tc-card: var(--color-kumo-base); --tc-fg: var(--text-color-kumo-default);
  --tc-muted: light-dark(#5b6470, #a3acb6); --tc-raised: light-dark(#f1f3f5, #1a1d21); --tc-line: light-dark(#e3e6ea, #2a2e33); --tc-edge: light-dark(#c9ced4, #4a5058);
  --tc-go: light-dark(#1a5fd0, #7fb0ff); --tc-go-tint: light-dark(#e6eefb, rgba(127, 176, 255, .16)); --tc-go-press: light-dark(#d3e1f8, rgba(127, 176, 255, .26));
  --tc-stop: light-dark(#b3261e, #ff9a90); --tc-stop-tint: light-dark(#fbe9e7, rgba(255, 154, 144, .15));
  --tc-in: light-dark(#1f7a46, #6fdca0); --tc-in-tint: light-dark(#e2f3e9, rgba(111, 220, 160, .15));
  --tc-snack: light-dark(#1d2024, #f2f4f6); --tc-snack-fg: light-dark(#f2f4f6, #111316); --tc-snack-act: light-dark(#8fb8ff, #1a5fd0);
  --tc-scrim: light-dark(rgba(20, 23, 26, .45), rgba(0, 0, 0, .55)); --tc-sheet: light-dark(#ffffff, #1d2024);
  container-type: inline-size; color: var(--tc-fg); font: 16px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.tc button, .tc input { font: inherit; color: inherit; }
.tc :focus-visible { outline: 3px solid var(--tc-go); outline-offset: 2px; }
.tc-grid { display: grid; gap: 32px; align-items: start; }
.tc-places { max-width: 480px; min-width: 0; }
.tc-desk { min-width: 0; display: grid; gap: 16px; }
.tc-top { padding: 0 0 8px; display: flex; align-items: center; justify-content: space-between; }
.tc-top h1 { margin: 0; font-size: 1.375rem; font-weight: 700; letter-spacing: -0.01em; }
.tc .tc-link { appearance: none; border: 0; background: none; color: var(--tc-go); font-weight: 600; min-height: 48px; padding: 0 4px; cursor: pointer; }
.tc-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); background: var(--tc-raised); border: 1px solid var(--tc-line); border-radius: 12px; padding: 3px; }
.tc .tc-tabs button { appearance: none; border: 0; min-height: 54px; border-radius: 9px; background: transparent; cursor: pointer; padding: 6px 2px 5px; display: grid; place-content: center; gap: 1px; position: relative; color: var(--tc-muted); }
.tc-tabs button + button::before { content: ""; position: absolute; left: -1px; top: 14px; bottom: 14px; width: 1px; background: var(--tc-line); }
.tc-tabs button[aria-selected="true"]::before, .tc-tabs button[aria-selected="true"] + button::before { opacity: 0; }
.tc-tabs b { font-size: 1.1875rem; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; color: var(--tc-fg); }
.tc-tabs button:not([aria-selected="true"]) b { color: var(--tc-muted); font-weight: 600; }
.tc-tabs span { font-size: .75rem; font-weight: 600; line-height: 1.2; letter-spacing: .01em; }
.tc .tc-tabs button[aria-selected="true"] { background: light-dark(#ffffff, #2c3036); color: var(--tc-fg); box-shadow: 0 1px 2px rgba(0, 0, 0, .12), 0 1px 6px rgba(0, 0, 0, .08), 0 0 0 1px var(--tc-line); }
.tc .tc-tabs button:not([aria-selected="true"]):active { background: var(--tc-line); }
.tc-tools { padding: 12px 0 4px; display: grid; gap: 8px; }
.tc-search { position: relative; display: block; }
.tc .tc-search input { width: 100%; box-sizing: border-box; height: 48px; border-radius: 12px; border: 1px solid var(--tc-line); background: var(--tc-raised); padding: 0 12px 0 38px; font-size: 16px; }
.tc-search input::placeholder { color: var(--tc-muted); }
.tc-search svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--tc-muted); }
.tc .tc-primary { appearance: none; border: 0; width: 100%; min-height: 48px; border-radius: 12px; background: var(--tc-go); color: light-dark(#fff, #0c0d0f); font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.tc-primary:disabled { opacity: .4; cursor: default; }
.tc-group { position: sticky; top: var(--tc-sticky, 0px); z-index: 1; margin: 8px 0 0; padding: 10px 0 8px; background: var(--tc-bg); border-bottom: 1px solid var(--tc-line); font-size: .8125rem; font-weight: 600; color: var(--tc-muted); }
.tc-row { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; align-items: center; column-gap: 12px; min-height: 76px; padding: 8px 0; box-sizing: border-box; position: relative; }
.tc-row + .tc-row::before { content: ""; position: absolute; top: 0; left: 60px; right: 0; height: 1px; background: var(--tc-line); }
.tc-row.left { opacity: .6; }
.tc .tc-count { appearance: none; border: 0; background: transparent; padding: 0; min-height: 48px; width: 48px; text-align: right; font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums; cursor: pointer; border-radius: 8px; letter-spacing: -0.02em; }
.tc .tc-count.none { color: var(--tc-muted); font-weight: 500; }
.tc-state { justify-self: end; font-size: .8125rem; font-weight: 700; padding: 4px 8px; border-radius: 999px; }
.tc-state.in { color: var(--tc-in); background: var(--tc-in-tint); }
.tc-state.out { color: var(--tc-muted); background: var(--tc-raised); }
.tc .tc-who { min-width: 0; appearance: none; border: 0; background: none; padding: 6px 0; text-align: left; cursor: pointer; border-radius: 8px; }
.tc-who b { display: block; font-size: 1rem; font-weight: 600; line-height: 1.25; }
.tc-who span { display: block; font-size: .8125rem; color: var(--tc-muted); margin-top: 2px; }
.tc .tc-pill { appearance: none; border: 0; min-height: 44px; padding: 0 16px; margin-block: 2px; margin-left: 8px; border-radius: 22px; background: var(--tc-go-tint); color: var(--tc-go); font-size: .9375rem; font-weight: 650; cursor: pointer; white-space: nowrap; }
.tc .tc-pill:active { background: var(--tc-go-press); }
.tc .tc-pill.stop { background: var(--tc-stop-tint); color: var(--tc-stop); }
.tc .tc-more { appearance: none; border: 0; background: none; width: 100%; min-height: 48px; color: var(--tc-go); font-weight: 600; cursor: pointer; text-align: left; padding: 0; }
.tc-empty { margin: 12px 0; padding: 16px; border-radius: 12px; background: var(--tc-raised); display: grid; gap: 4px; }
.tc-empty b { font-size: .9375rem; }
.tc-empty span { font-size: .875rem; color: var(--tc-muted); }
.tc-error { margin: 8px 0 0; color: var(--tc-stop); font-weight: 600; }

.tc-snack { position: fixed; z-index: 60; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom, 0px)); max-width: 456px; margin: 0 auto; min-height: 56px; box-sizing: border-box; background: var(--tc-snack); color: var(--tc-snack-fg); border-radius: 12px; padding: 4px 4px 4px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: .875rem; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,.3); }
.tc .tc-snack button { appearance: none; border: 0; background: none; color: var(--tc-snack-act); font-weight: 700; min-height: 48px; padding: 0 14px; cursor: pointer; }
.tc-scrim { position: fixed; z-index: 70; inset: 0; background: var(--tc-scrim); display: flex; align-items: flex-end; justify-content: center; }
.tc-sheet { width: 100%; max-width: 480px; box-sizing: border-box; max-height: 92dvh; overflow-y: auto; background: var(--tc-sheet); border-radius: 20px 20px 0 0; padding: 8px 16px max(16px, env(safe-area-inset-bottom, 0px)); display: grid; gap: 14px; box-shadow: 0 -8px 24px rgba(0,0,0,.25); }
.tc-grip { width: 36px; height: 5px; border-radius: 3px; background: var(--tc-edge); justify-self: center; }
.tc-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tc-sheet h2 { margin: 0; font-size: 1.125rem; font-weight: 700; outline: none; }
.tc-sheet-sub { margin: -8px 0 0; font-size: .875rem; color: var(--tc-muted); }
.tc-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; column-gap: 12px; min-height: 68px; border-bottom: 1px solid var(--tc-line); }
.tc-field:last-child { border-bottom: 0; }
.tc-field label, .tc-field > span { font-weight: 600; }
.tc-mini { display: grid; grid-template-columns: 52px 56px 52px; gap: 8px; align-items: center; }
.tc .tc-mini button, .tc .tc-big button { appearance: none; border: 1px solid var(--tc-line); width: 52px; height: 52px; border-radius: 50%; background: var(--tc-raised); font-size: 1.375rem; cursor: pointer; }
.tc .tc-mini input { width: 56px; height: 44px; box-sizing: border-box; text-align: center; border: 0; border-bottom: 2px solid var(--tc-edge); background: transparent; font-size: 1.75rem; font-weight: 700; font-variant-numeric: tabular-nums; border-radius: 0; }
.tc .tc-mini input[aria-invalid="true"], .tc .tc-big input[aria-invalid="true"] { border-bottom-color: var(--tc-stop); }
.tc-big { display: grid; grid-template-columns: 56px 1fr 56px; align-items: center; gap: 8px; }
.tc .tc-big button { width: 56px; height: 56px; font-size: 1.5rem; }
.tc .tc-big input { width: 100%; min-width: 0; text-align: center; border: 0; border-bottom: 2px solid var(--tc-edge); background: transparent; font-size: 2.5rem; font-weight: 700; font-variant-numeric: tabular-nums; border-radius: 0; }
.tc-switch-wrap { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: .9375rem; }
.tc .tc-switch { appearance: none; border: 0; width: 64px; height: 36px; border-radius: 18px; background: var(--tc-edge); position: relative; cursor: pointer; }
.tc-switch::after { content: ""; position: absolute; top: 4px; left: 4px; width: 28px; height: 28px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgba(0,0,0,.3); }
.tc .tc-switch[aria-checked="true"] { background: var(--tc-in); }
.tc-switch[aria-checked="true"]::after { transform: translateX(28px); }
.tc-switch::before { content: ""; position: absolute; inset: -6px; }
@media (prefers-reduced-motion: reduce) { .tc-switch::after { transition: none; } }
.tc-err { color: var(--tc-stop); font-size: .8125rem; font-weight: 600; margin: -6px 0 0; }
.tc-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tc .tc-ghost { appearance: none; border: 1px solid var(--tc-line); min-height: 48px; border-radius: 12px; background: var(--tc-raised); font-weight: 600; cursor: pointer; padding: 0 14px; }
.tc-picks { display: grid; gap: 4px; max-height: 220px; overflow-y: auto; }
.tc .tc-picks button { appearance: none; border: 1px solid transparent; background: var(--tc-raised); min-height: 48px; border-radius: 10px; text-align: left; padding: 0 12px; cursor: pointer; font-weight: 500; }
.tc .tc-picks button[aria-pressed="true"] { border-color: var(--tc-go); background: var(--tc-go-tint); color: var(--tc-go); font-weight: 650; }
.tc-picks .tc-empty { margin: 0; }
.tc-picked { margin: 0; font-size: .9375rem; }

.tc-table { background: var(--tc-card); border: 1px solid var(--tc-line); border-radius: 12px; overflow: hidden; }
.tc-table-head { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--tc-line); }
.tc-table-head strong { font-size: 1.0625rem; }
.tc-table-head span { color: var(--tc-muted); font-size: .875rem; }
.tc-wrap { overflow: auto; max-height: 520px; }
.tc table { border-collapse: separate; border-spacing: 0; width: 100%; font-size: 1.0625rem; min-width: 620px; }
.tc th, .tc td { text-align: right; padding: 12px 20px; border-bottom: 1px solid var(--tc-line); font-variant-numeric: tabular-nums; background: var(--tc-card); }
.tc thead th { position: sticky; top: 0; z-index: 2; white-space: nowrap; font-size: .875rem; font-weight: 600; color: var(--tc-muted); background: var(--tc-bg); }
.tc th[scope="row"], .tc thead th:first-child { text-align: left; position: sticky; left: 0; z-index: 1; }
.tc thead th:first-child { z-index: 3; }
.tc th[scope="row"] button { appearance: none; border: 0; background: none; padding: 0; min-height: 32px; font-weight: 600; cursor: pointer; text-align: left; }
.tc th[scope="row"] small { display: block; font-size: .8125rem; font-weight: 400; color: var(--tc-muted); }
.tc td { font-weight: 600; }
.tc td.z { color: var(--tc-muted); font-weight: 400; }
.tc td .tc-state { display: inline-block; padding: 3px 8px; }
.tc td .tc-state.out { background: var(--tc-bg); }
.tc tbody tr:last-child th, .tc tbody tr:last-child td { border-bottom: 0; }
.tc-log h2 { margin: 0 0 8px; font-size: 1rem; font-weight: 600; }
.tc-log ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; font-size: .9375rem; color: var(--tc-muted); }

/* Phone: one view at a time. Wide: places beside the overview. */
@container (max-width: 899px) { .tc[data-view="places"] .tc-desk, .tc[data-view="overview"] .tc-places { display: none; } }
@container (min-width: 900px) { .tc-grid { grid-template-columns: minmax(340px, 420px) minmax(0, 1fr); } .tc .tc-link { display: none; } }
`;

export function TubCounts() {
	const [rows, setRows] = React.useState<Row[] | null>(null);
	const [log, setLog] = React.useState<LogEntry[]>([]);
	const [error, setError] = React.useState("");
	const [place, setPlace] = React.useState<Place>("back");
	const [query, setQuery] = React.useState("");
	const [showAll, setShowAll] = React.useState(false);
	const [view, setView] = React.useState<"places" | "overview">("places");
	const [sheet, setSheet] = React.useState<Sheet>(null);
	const [snack, setSnack] = React.useState<Snack | null>(null);
	// Changes go to the server one after another, so quick taps are never lost or out of order.
	// Each shows at once; the server's counts replace them once nothing is waiting.
	const queue = React.useRef<Promise<unknown>>(Promise.resolve());
	const waiting = React.useRef(0);
	const snackId = React.useRef(0);
	const timer = React.useRef<number | undefined>(undefined);
	const groups = React.useRef(new Map<number, Group>());
	const last = React.useRef<{ key: string; id: number; at: number } | null>(null);
	// Rows stay put after their last tub leaves, until you switch places or search.
	const pinned = React.useRef(new Set<string>());
	const focusRow = React.useRef<string | null>(null);
	const root = React.useRef<HTMLDivElement>(null);

	const read = async (response: Response) => {
		const body = (await response.json()) as { data?: Reply; error?: { message?: string } };
		if (!response.ok || !body.data) throw new Error(body.error?.message || "Couldn’t load the counts.");
		return body.data;
	};
	const reload = () =>
		fetch(URL, { headers })
			.then(read)
			.then((data) => {
				setRows(data.rows);
				setLog(data.changes);
			})
			.catch((e) => setError(e.message));
	React.useEffect(() => {
		reload();
		// Section headings stick to the very top of the admin's scrolling area, not below its padding.
		const scroller = root.current?.closest("main");
		if (scroller) root.current!.style.setProperty("--tc-sticky", `-${getComputedStyle(scroller).paddingTop}`);
	}, []);
	// After a tap, keep focus on that row even if its button went away.
	React.useLayoutEffect(() => {
		const id = focusRow.current;
		if (!id || root.current?.contains(document.activeElement)) return;
		focusRow.current = null;
		const row = root.current?.querySelector(`.tc-places [data-row="${CSS.escape(id)}"]`);
		row?.querySelector<HTMLElement>(".tc-pill, .tc-who")?.focus();
	}, [rows]);

	const showSnack = (s: Snack) => {
		setSnack(s);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			setSnack((now) => (now?.id === s.id ? null : now));
			if (last.current?.id === s.id) last.current = null;
		}, UNDO_MS);
	};
	const note = (text: string) => showSnack({ id: ++snackId.current, text, note: true });
	const local = (flavor: string, next: (r: Row) => Tubs | null) => setRows((all) => all && all.map((r) => (r.id === flavor ? { ...r, ...(next(r) ?? r) } : r)));
	/** Queues one request; `body` is read when its turn comes, so an undo can use what the changes before it returned. */
	const post = (body: () => object | null, after: (data: Reply) => void) => {
		waiting.current++;
		queue.current = queue.current
			.then(() => {
				const b = body();
				return b && fetch(URL, { method: "POST", headers, body: JSON.stringify(b) }).then(read);
			})
			.then((data) => {
				waiting.current--;
				if (!data) return void (waiting.current === 0 && reload());
				if (waiting.current === 0) setRows(data.rows);
				setLog(data.changes);
				setError("");
				after(data);
			})
			.catch((e) => {
				waiting.current--;
				setError(e.message);
				if (waiting.current === 0) reload();
			});
	};

	const all = rows ?? [];
	const twin = (r: Row) => !!r.category && all.filter((o) => o.name === r.name).length > 1;
	const label = (r: Row) => (twin(r) ? `${r.name} (${r.category})` : r.name);
	const byId = (id: string) => all.find((r) => r.id === id);

	const change = (r: Row, c: Change) => {
		setSheet(null);
		const shown: Change = c.action === "into" ? { ...c, swap: r.cab } : c;
		const repeat = repeatKey(shown);
		const key = repeat && `${r.id}:${repeat}`;
		const now = Date.now();
		let id: number;
		let group: Group;
		if (key && last.current?.key === key && now - last.current.at < UNDO_MS && snack?.id === last.current.id && groups.current.has(last.current.id)) {
			id = last.current.id;
			group = groups.current.get(id)!;
			group.n++;
		} else {
			id = ++snackId.current;
			group = { flavor: r.id, shown, n: 1, ok: 0, server: null };
			groups.current.set(id, group);
		}
		last.current = key ? { key, id, at: now } : null;
		focusRow.current = r.id;
		local(r.id, (t) => applyChange(t, c));
		showSnack({ id, text: changeText({ ...shown, count: group.n } as Change, label(r)) });
		post(
			() => ({ flavor: r.id, change: c }),
			(data) => {
				if (data.done) {
					group.ok++;
					group.server = data.done.change;
				} else if (data.failed) note(data.failed);
			},
		);
	};
	// Undo works straight away: it waits in the queue behind its changes, then takes back the ones that went through.
	const undo = () => {
		const group = snack && !snack.note && groups.current.get(snack.id);
		if (!group) return;
		setSnack(null);
		last.current = null;
		local(group.flavor, (t) => undoChange(t, { ...group.shown, count: group.n } as Change));
		post(
			() => (group.ok && group.server ? { flavor: group.flavor, undo: { ...group.server, ...(group.ok > 1 && { count: group.ok }) } } : null),
			(data) => data.failed && note(data.failed),
		);
	};
	const open = (s: { kind: "flavor"; id: string } | { kind: "batch" }) => setSheet({ ...s, from: document.activeElement as HTMLElement | null });
	const closeSheet = (restore: boolean) => {
		const from = sheet?.from;
		setSheet(null);
		if (restore) window.setTimeout(() => from?.focus(), 0);
	};
	const pickPlace = (p: Place) => {
		setPlace(p);
		setShowAll(false);
		setQuery("");
		pinned.current = new Set();
	};

	const where = (r: Row) => {
		const bits: string[] = [];
		if (twin(r)) bits.push(r.category);
		if (place !== "hard" && r.hard) bits.push(`Hardening ${r.hard}`);
		if (place !== "back" && r.back) bits.push(`Back ${r.back}`);
		if (place !== "front" && r.front) bits.push(`Front ${r.front}`);
		if (place !== "cab" && r.cab) bits.push("In cabinets");
		return bits.join(" · ") || "None anywhere else";
	};
	const pill = (text: string, aria: string, run: () => void, stop = false) => (
		<button type="button" className={stop ? "tc-pill stop" : "tc-pill"} aria-label={aria} onClick={run}>
			{text}
		</button>
	);
	const toCabinets = (r: Row) =>
		r.cab
			? pill("Swap tub", `Swap a fresh ${label(r)} into the cabinets`, () => change(r, { action: "into" }))
			: pill("Into cabinets", `Put ${label(r)} in the cabinets`, () => change(r, { action: "into" }));
	const actionFor = (r: Row) => {
		if (place === "hard" || place === "back") {
			if (!r[place]) return null;
			return pill(place === "hard" ? "To back" : "To front", `Move 1 ${label(r)} to ${placeWords(NEXT[place])}`, () => change(r, { action: "move", from: place }));
		}
		if (r.front) return toCabinets(r);
		if (place === "cab" && r.cab) return pill("Used up", `${label(r)} used up, empty its slot`, () => change(r, { action: "usedUp" }), true);
		return null;
	};
	const row = (r: Row) => (
		<div key={r.id} data-row={r.id} className={!has(r, place) && pinned.current.has(r.id) ? "tc-row left" : "tc-row"}>
			{place === "cab" ? (
				<span className={r.cab ? "tc-state in" : "tc-state out"}>{r.cab ? "In" : "Out"}</span>
			) : (
				<button type="button" className={r[place] ? "tc-count" : "tc-count none"} aria-label={`${label(r)}, ${r[place] || "none"} in ${placeWords(place)}. Open ${label(r)}`} onClick={() => open({ kind: "flavor", id: r.id })}>
					{r[place] || "–"}
				</button>
			)}
			<button type="button" className="tc-who" onClick={() => open({ kind: "flavor", id: r.id })}>
				<b>{r.name}</b>
				<span>{where(r)}</span>
			</button>
			{actionFor(r) ?? <span />}
		</div>
	);
	const heading = (text: string) => <h2 className="tc-group">{text}</h2>;

	const q = query.trim().toLowerCase();
	const match = all.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(q));
	const here = match.filter((r) => has(r, place) || pinned.current.has(r.id));
	for (const r of here) pinned.current.add(r.id);
	const ready = place === "cab" ? match.filter((r) => !here.includes(r) && r.front) : [];
	const rest = match.filter((r) => !here.includes(r) && !ready.includes(r));

	return (
		<div className="tc" data-view={view} ref={root}>
			<style>{css}</style>
			<div className="tc-grid">
				<section className="tc-places" aria-labelledby="tc-title">
					<div className="tc-top">
						<h1 id="tc-title">Tub counts</h1>
						<button type="button" className="tc-link" onClick={() => setView("overview")}>
							Overview
						</button>
					</div>
					<div className="tc-tabs" role="tablist" aria-labelledby="tc-title">
						{PLACES.map(([p, name, full]) => {
							// Each place shows how many tubs are there; Cabinets counts flavors in.
							const n = all.reduce((t, r) => t + (p === "cab" ? (r.cab ? 1 : 0) : r[p]), 0);
							const said = p === "cab" ? `${full}, ${n} ${n === 1 ? "flavor" : "flavors"} in` : `${full}, ${n} ${n === 1 ? "tub" : "tubs"}`;
							return (
								<button key={p} type="button" role="tab" id={`tc-tab-${p}`} aria-selected={p === place} aria-controls="tc-list" aria-label={said} onClick={() => pickPlace(p)}>
									<b>{n || "–"}</b>
									<span>{name}</span>
								</button>
							);
						})}
					</div>
					<div className="tc-tools">
						{place === "hard" && (
							<button type="button" className="tc-primary" onClick={() => open({ kind: "batch" })}>
								+&nbsp; Made a batch
							</button>
						)}
						<label className="tc-search">
							<SearchIcon />
							<input
								type="search"
								placeholder="Find a flavor"
								aria-label="Find a flavor"
								autoComplete="off"
								value={query}
								onChange={(e) => {
									setQuery(e.target.value);
									pinned.current = new Set();
								}}
							/>
						</label>
					</div>
					{error && (
						<p className="tc-error" role="alert">
							{error}
						</p>
					)}
					<div id="tc-list" role="tabpanel" aria-labelledby={`tc-tab-${place}`} aria-busy={rows === null}>
						{rows === null && !error && (
							<div className="tc-empty">
								<span>Loading…</span>
							</div>
						)}
						{rows !== null && (
							<>
								{here.length > 0 && heading(HERE[place])}
								{here.map(row)}
								{here.length === 0 && !q && (
									<div className="tc-empty">
										<b>{EMPTY_TITLE[place]}</b>
										<span>{EMPTY_HINT[place]}</span>
									</div>
								)}
								{ready.length > 0 && heading("Ready from the front freezer")}
								{ready.map(row)}
								{rest.length > 0 &&
									(showAll || q ? (
										<>
											{heading(place === "cab" ? "Out, nothing up front" : "None here")}
											{rest.map(row)}
										</>
									) : (
										<button type="button" className="tc-more" onClick={() => setShowAll(true)}>
											Show {rest.length} flavors with none here
										</button>
									))}
								{q && match.length === 0 && (
									<div className="tc-empty">
										<b>No flavor matches “{query.trim()}”</b>
										<span>Check the spelling, or clear the search.</span>
									</div>
								)}
							</>
						)}
					</div>
				</section>

				<section className="tc-desk" aria-labelledby="tc-overview">
					<div className="tc-top">
						<h1 id="tc-overview">Overview</h1>
						<button type="button" className="tc-link" onClick={() => setView("places")}>
							By place
						</button>
					</div>
					<div className="tc-table">
						<div className="tc-table-head">
							<strong>What we have</strong>
							<span>Every flavor, A–Z · a dash means none</span>
						</div>
						<div className="tc-wrap">
							<table>
								<thead>
									<tr>
										<th scope="col">Flavor</th>
										<th scope="col">Hardening</th>
										<th scope="col">Back freezer</th>
										<th scope="col">Front freezer</th>
										<th scope="col">Cabinets</th>
									</tr>
								</thead>
								<tbody>
									{all.map((r) => (
										<tr key={r.id}>
											<th scope="row">
												<button type="button" onClick={() => open({ kind: "flavor", id: r.id })}>
													{r.name}
													{twin(r) && <small>{r.category}</small>}
												</button>
											</th>
											{(["hard", "back", "front"] as const).map((k) =>
												r[k] ? (
													<td key={k}>{r[k]}</td>
												) : (
													<td key={k} className="z" aria-label="none">
														–
													</td>
												),
											)}
											<td>
												<span className={r.cab ? "tc-state in" : "tc-state out"}>{r.cab ? "In" : "Out"}</span>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					<section className="tc-log" aria-labelledby="tc-log-title">
						<h2 id="tc-log-title">Recent changes</h2>
						<ul>
							{log.length === 0 ? (
								<li>No changes yet.</li>
							) : (
								log.map((c) => (
									<li key={c.at + c.text}>
										{when(c.at)} · {c.text}
										{c.by && ` · ${c.by}`}
									</li>
								))
							)}
						</ul>
					</section>
				</section>
			</div>

			{snack && (
				<div className="tc-snack">
					<span role="status">{snack.text}</span>
					{!snack.note && (
						<button type="button" onClick={undo}>
							Undo
						</button>
					)}
				</div>
			)}
			{sheet?.kind === "flavor" && byId(sheet.id) && (
				<FlavorSheet row={byId(sheet.id)!} title={label(byId(sheet.id)!)} onClose={closeSheet} onSave={(to) => change(byId(sheet.id)!, { action: "save", to })} />
			)}
			{sheet?.kind === "batch" && <BatchSheet rows={all} label={label} onClose={closeSheet} onAdd={(r, count) => change(r, { action: "batch", count })} />}
		</div>
	);
}

/**
 * A bottom sheet: a labelled dialog that puts focus on its title, keeps Tab inside, and closes on
 * Escape. Tapping outside closes it only when nothing has been changed.
 */
function SheetFrame({ title, titleId, dirty, onClose, head, sub, children }: { title: string; titleId: string; dirty: boolean; onClose: (restore: boolean) => void; head?: React.ReactNode; sub?: string; children: React.ReactNode }) {
	const ref = React.useRef<HTMLDivElement>(null);
	const focusTitle = () => ref.current?.querySelector<HTMLElement>("h2")?.focus();
	const close = React.useRef(onClose);
	close.current = onClose;
	React.useEffect(() => {
		focusTitle();
		const onEscape = (e: KeyboardEvent) => e.key === "Escape" && close.current(true);
		document.addEventListener("keydown", onEscape);
		return () => document.removeEventListener("keydown", onEscape);
	}, []);
	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key !== "Tab" || !ref.current) return;
		const f = [...ref.current.querySelectorAll<HTMLElement>("button:not(:disabled), input")];
		if (!f.length) return;
		if (e.shiftKey && (document.activeElement === f[0] || !f.includes(document.activeElement as HTMLElement))) {
			e.preventDefault();
			f.at(-1)!.focus();
		} else if (!e.shiftKey && document.activeElement === f.at(-1)) {
			e.preventDefault();
			f[0].focus();
		}
	};
	return (
		<div
			className="tc-scrim"
			onClick={(e) => {
				if (e.target !== e.currentTarget) return;
				if (dirty) focusTitle();
				else onClose(true);
			}}
		>
			<div className="tc-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} onKeyDown={onKeyDown}>
				<div className="tc-grip" />
				<div className="tc-sheet-head">
					<h2 id={titleId} tabIndex={-1}>
						{title}
					</h2>
					{head}
				</div>
				{sub && <p className="tc-sheet-sub">{sub}</p>}
				{children}
			</div>
		</div>
	);
}

/** − typed number + ; the number keeps what was typed so a mistake can be seen and fixed. */
function Stepper({ id, name, value, min, big, onChange }: { id: string; name: string; value: string; min: number; big?: boolean; onChange: (v: string) => void }) {
	const n = whole(value, min);
	const step = (by: number) => onChange(String(Math.min(MAX_COUNT, Math.max(min, (n ?? (parseInt(value, 10) || 0)) + by))));
	return (
		<div className={big ? "tc-big" : "tc-mini"}>
			<button type="button" aria-label={`One fewer, ${name}`} onClick={() => step(-1)}>
				−
			</button>
			<input id={id} inputMode="numeric" aria-label={big ? `Number of ${name}` : undefined} aria-invalid={n === null} value={value} onFocus={(e) => e.currentTarget.select()} onChange={(e) => onChange(e.target.value)} />
			<button type="button" aria-label={`One more, ${name}`} onClick={() => step(1)}>
				+
			</button>
		</div>
	);
}

function FlavorSheet({ row, title, onClose, onSave }: { row: Row; title: string; onClose: (restore: boolean) => void; onSave: (to: Tubs) => void }) {
	const [draft, setDraft] = React.useState({ hard: String(row.hard), back: String(row.back), front: String(row.front) });
	const [cab, setCab] = React.useState(row.cab);
	const [dirty, setDirty] = React.useState(false);
	const fields: Array<[keyof typeof draft, string]> = [["hard", "Hardening"], ["back", "Back freezer"], ["front", "Front freezer"]];
	const values = { hard: whole(draft.hard, 0), back: whole(draft.back, 0), front: whole(draft.front, 0) };
	const bad = Object.values(values).includes(null);
	const save = () => {
		if (bad) return;
		const to = { ...(values as Omit<Tubs, "cab">), cab };
		if ((["hard", "back", "front", "cab"] as const).every((k) => to[k] === row[k])) onClose(true);
		else onSave(to);
	};
	return (
		<SheetFrame title={title} titleId="tc-sheet-title" sub="Set any count, then Save." dirty={dirty} onClose={onClose}>
			<div>
				{fields.map(([k, name]) => (
					<div className="tc-field" key={k}>
						<label htmlFor={`tc-${k}`}>{name}</label>
						<Stepper
							id={`tc-${k}`}
							name={name}
							value={draft[k]}
							min={0}
							onChange={(v) => {
								setDraft((d) => ({ ...d, [k]: v }));
								setDirty(true);
							}}
						/>
					</div>
				))}
				<div className="tc-field">
					<span id="tc-cab-label">Cabinets</span>
					<div className="tc-switch-wrap">
						<span aria-hidden="true">{cab ? "In" : "Out"}</span>
						<button
							type="button"
							className="tc-switch"
							role="switch"
							aria-checked={cab}
							aria-labelledby="tc-cab-label"
							onClick={() => {
								setCab((c) => !c);
								setDirty(true);
							}}
						/>
					</div>
				</div>
			</div>
			{bad && <p className="tc-err">Use whole numbers, 0 or more.</p>}
			<div className="tc-acts">
				<button type="button" className="tc-ghost" onClick={() => onClose(true)}>
					Cancel
				</button>
				<button type="button" className="tc-primary" disabled={bad} onClick={save}>
					Save
				</button>
			</div>
		</SheetFrame>
	);
}

function BatchSheet({ rows, label, onClose, onAdd }: { rows: Row[]; label: (r: Row) => string; onClose: (restore: boolean) => void; onAdd: (r: Row, count: number) => void }) {
	const [find, setFind] = React.useState("");
	const [pick, setPick] = React.useState<string | null>(null);
	const [count, setCount] = React.useState("1");
	const [dirty, setDirty] = React.useState(false);
	const q = find.trim().toLowerCase();
	const picks = rows.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(q));
	const chosen = rows.find((r) => r.id === pick);
	const n = whole(count, 1);
	return (
		<SheetFrame
			title="Made a batch"
			titleId="tc-batch-title"
			dirty={dirty}
			onClose={onClose}
			head={
				<button type="button" className="tc-ghost" onClick={() => onClose(true)}>
					Cancel
				</button>
			}
		>
			<label className="tc-search">
				<SearchIcon />
				<input placeholder="Which flavor?" aria-label="Which flavor?" autoComplete="off" value={find} onChange={(e) => setFind(e.target.value)} />
			</label>
			<div className="tc-picks">
				{picks.length === 0 ? (
					<div className="tc-empty">
						<b>No matching flavors</b>
						<span>Clear the search to see them all.</span>
					</div>
				) : (
					picks.map((r) => (
						<button
							key={r.id}
							type="button"
							aria-pressed={pick === r.id}
							onClick={() => {
								setPick(r.id);
								setDirty(true);
							}}
						>
							{label(r)}
						</button>
					))
				)}
			</div>
			<p className="tc-picked" aria-live="polite">
				{chosen ? (
					<>
						Adding to Hardening: <b>{label(chosen)}</b>
					</>
				) : (
					"No flavor picked yet."
				)}
			</p>
			<Stepper
				id="tc-batch-count"
				name="tubs"
				value={count}
				min={1}
				big
				onChange={(v) => {
					setCount(v);
					setDirty(true);
				}}
			/>
			<button type="button" className="tc-primary" disabled={!chosen || n === null} onClick={() => chosen && n !== null && onAdd(chosen, n)}>
				{chosen ? "Add to Hardening" : "Pick a flavor first"}
			</button>
		</SheetFrame>
	);
}
