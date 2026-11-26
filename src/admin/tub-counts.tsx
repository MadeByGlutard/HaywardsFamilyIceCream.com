import * as React from "react";
import { applyChange, type Change, changeText, MAX_COUNT, NEXT, placeWords, plural, type Tubs, tubsInAll, undoChange } from "./tub-flow";

/**
 * Tub counts, built around where a tub is. On a phone: pick a place, see only the flavors there,
 * and tap the one next move. Each flavor's sheet sets all its counts at once. On a wide screen
 * the A–Z overview sits beside it. Every change shows at once and can be undone for 5 seconds.
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
type Sheet = { kind: "flavor"; id: string } | { kind: "batch" } | null;
interface Snack {
	id: number;
	text: string;
	/** A change shows Undo; a note (nothing to move, couldn't undo) doesn't. */
	note?: boolean;
	flavor?: string;
	change?: Change;
}

const PLACES: Array<[Place, string]> = [["hard", "Hardening"], ["back", "Back"], ["front", "Front"], ["cab", "Cabinets"]];
const TITLE: Record<Place, string> = { hard: "Hardening", back: "Back freezer", front: "Front freezer", cab: "In the cabinets" };
const EMPTY_TITLE: Record<Place, string> = { hard: "Nothing hardening", back: "The back freezer is empty", front: "The front freezer is empty", cab: "Nothing in the cabinets" };
const EMPTY_HINT: Record<Place, string> = {
	hard: "Tap Made a batch when tubs come off the machine.",
	back: "Move tubs here from Hardening.",
	front: "Move tubs here from the back freezer.",
	cab: "Move one up from the front freezer.",
};
const URL = "/_emdash/api/plugins/haywards-admin/tubs";
const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };
const has = (r: Row, p: Place) => (p === "cab" ? r.cab : r[p] > 0);

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

// Sizes, wording and states follow the approved mockup; colours are the admin's own (light and dark).
const css = `
.tc { --tc-go: var(--text-color-kumo-link, var(--color-kumo-brand)); --tc-go-tint: var(--color-kumo-info-tint); --tc-stop: var(--text-color-kumo-danger); --tc-stop-tint: var(--color-kumo-danger-tint);
  --tc-in: var(--color-kumo-success); --tc-raised: light-dark(var(--color-kumo-tint), var(--color-kumo-base)); --tc-line: var(--color-kumo-hairline, var(--color-kumo-line)); --tc-muted: var(--text-color-kumo-subtle); --tc-faint: var(--text-color-kumo-inactive, var(--text-color-kumo-subtle));
  --tc-bg: var(--color-kumo-elevated); --tc-card: var(--color-kumo-base); --tap: 48px;
  container-type: inline-size; font: 15px/1.35 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.tc button, .tc input { font: inherit; color: inherit; }
.tc :focus-visible { outline: 2px solid var(--tc-go); outline-offset: 2px; }
.tc-grid { display: grid; gap: 32px; align-items: start; }
.tc-places { max-width: 480px; min-width: 0; }
.tc-desk { min-width: 0; display: grid; gap: 24px; }
.tc-top { padding: 0 0 8px; display: flex; align-items: center; justify-content: space-between; }
.tc-top h1 { margin: 0; font-size: 1.375rem; font-weight: 700; letter-spacing: -0.01em; }
.tc .tc-link { appearance: none; border: 0; background: none; color: var(--tc-go); font-weight: 600; min-height: var(--tap); padding: 0 4px; cursor: pointer; }
.tc-seg { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--tc-raised); border-radius: 12px; padding: 3px; gap: 2px; }
.tc-seg button { appearance: none; border: 0; background: transparent; border-radius: 9px; min-height: 52px; display: grid; place-content: center; gap: 1px; cursor: pointer; color: var(--tc-muted); }
.tc-seg b { font-size: 1.125rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-color-kumo-default); }
.tc-seg span { font-size: .75rem; font-weight: 600; }
.tc-seg button[aria-pressed="true"] { background: light-dark(var(--color-kumo-base), var(--color-kumo-tint)); box-shadow: 0 1px 2px var(--color-kumo-shadow-edge, rgba(0,0,0,.3)); color: var(--text-color-kumo-default); }
.tc-tools { padding: 12px 0 4px; display: grid; gap: 8px; }
.tc-search { position: relative; display: block; }
.tc-search input { width: 100%; box-sizing: border-box; height: 44px; border-radius: 10px; border: 0; background: var(--tc-raised); padding: 0 12px 0 36px; font-size: 16px; }
.tc-search input::placeholder { color: var(--tc-faint); }
.tc-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: var(--tc-faint); }
.tc-primary { appearance: none; border: 0; width: 100%; height: var(--tap); border-radius: 12px; background: var(--color-kumo-brand); color: #fff !important; font-weight: 700 !important; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }
.tc-primary:active { filter: brightness(.92); }
.tc-primary:disabled { opacity: .45; cursor: not-allowed; }
.tc-group { position: sticky; top: var(--tc-sticky, 0px); z-index: 1; margin-top: 8px; padding: 8px 0; background: var(--tc-bg); border-bottom: 1px solid var(--tc-line); font-size: .75rem; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--tc-faint); display: flex; justify-content: space-between; }
.tc-group span + span { letter-spacing: 0; text-transform: none; font-variant-numeric: tabular-nums; }
.tc-empty { margin: 12px 0; padding: 16px; border-radius: 12px; background: var(--tc-raised); display: grid; gap: 4px; }
.tc-empty b { font-size: .9375rem; }
.tc-empty span { font-size: .8125rem; color: var(--tc-muted); }
.tc-row { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; column-gap: 12px; min-height: 64px; position: relative; }
.tc-row + .tc-row::before { content: ""; position: absolute; top: 0; left: 56px; right: 0; height: 1px; background: var(--tc-line); }
.tc-count { appearance: none; border: 0; background: transparent; padding: 0; min-height: var(--tap); width: 44px; text-align: right; font-size: 1.75rem !important; font-weight: 700 !important; font-variant-numeric: tabular-nums; cursor: pointer; border-radius: 8px; letter-spacing: -0.02em; }
.tc-count:active, .tc-who:active { background: var(--tc-raised); }
.tc-dot { width: 44px; display: grid; justify-items: end; }
.tc-dot i, .tc-ring { display: block; width: 14px; height: 14px; border-radius: 50%; background: var(--tc-in); box-shadow: 0 0 0 4px var(--color-kumo-success-tint); margin-right: 8px; }
.tc-dot i.off { background: transparent; box-shadow: inset 0 0 0 2px var(--tc-faint); }
.tc-who { min-width: 0; appearance: none; border: 0; background: none; padding: 8px 0; text-align: left; cursor: pointer; border-radius: 8px; }
.tc-who b { display: block; font-size: 1rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-who span { display: block; font-size: .8125rem; color: var(--tc-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-pill { appearance: none; border: 0; height: 36px; padding: 0 14px; border-radius: 999px; background: var(--tc-go-tint); color: var(--tc-go) !important; font-size: .875rem !important; font-weight: 650 !important; cursor: pointer; position: relative; white-space: nowrap; }
.tc-pill::before { content: ""; position: absolute; inset: -6px -4px; }
.tc-pill:active { filter: brightness(.9); }
.tc-pill.stop { background: var(--tc-stop-tint); color: var(--tc-stop) !important; }
.tc .tc-more { appearance: none; border: 0; background: none; width: 100%; min-height: var(--tap); color: var(--tc-go); font-weight: 600; cursor: pointer; text-align: left; padding: 0; }
.tc-quiet { color: var(--tc-faint) !important; }
.tc-row.dim .tc-who b { color: var(--tc-muted); }
.tc-error { margin: 8px 0 0; color: var(--text-color-kumo-danger); font-weight: 600; }

.tc-snack { position: fixed; z-index: 60; left: 12px; right: 12px; bottom: max(12px, env(safe-area-inset-bottom, 0px)); max-width: 456px; margin: 0 auto; min-height: 52px; background: var(--color-kumo-contrast); color: var(--text-color-kumo-inverse); border-radius: 12px; padding: 0 6px 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: .875rem; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,.4); }
.tc-snack button { appearance: none; border: 0; background: none; color: light-dark(oklch(78% .12 255), oklch(50% .2 260)) !important; font-weight: 700 !important; min-height: 44px; padding: 0 12px; cursor: pointer; }
.tc-snack button:disabled { opacity: .5; }
.tc-scrim { position: fixed; z-index: 70; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; justify-content: center; }
.tc-sheet { width: 100%; max-width: 480px; box-sizing: border-box; max-height: calc(100dvh - 24px); overflow-y: auto; --tc-raised: var(--color-kumo-tint); background: var(--tc-card); border-radius: 20px 20px 0 0; padding: 8px 16px max(16px, env(safe-area-inset-bottom, 0px)); display: grid; gap: 16px; box-shadow: 0 -8px 32px rgba(0,0,0,.3); }
.tc-grip { width: 36px; height: 5px; border-radius: 3px; background: var(--color-kumo-interact, var(--tc-line)); justify-self: center; }
.tc-sheet h2 { margin: 0; font-size: 1.0625rem; font-weight: 700; }
.tc-sheet h2 span { display: block; font-size: .8125rem; font-weight: 500; color: var(--tc-muted); margin-top: 2px; }
.tc-big { display: grid; grid-template-columns: 56px 1fr 56px; align-items: center; gap: 8px; }
.tc-big button { appearance: none; border: 0; width: 56px; height: 56px; border-radius: 50%; background: var(--tc-raised); font-size: 1.5rem !important; cursor: pointer; }
.tc-big input { width: 100%; min-width: 0; text-align: center; border: 0; background: transparent; font: 700 3rem/1 ui-sans-serif, system-ui, sans-serif !important; font-variant-numeric: tabular-nums; }
.tc-acts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tc-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; min-height: 60px; border-bottom: 1px solid var(--tc-line); }
.tc-field:last-child { border-bottom: 0; }
.tc-field label { font-weight: 600; }
.tc-field label span { display: block; font-size: .8125rem; font-weight: 400; color: var(--tc-muted); }
.tc-mini { display: grid; grid-template-columns: 44px 52px 44px; align-items: center; }
.tc-mini button { appearance: none; border: 0; width: 44px; height: 44px; border-radius: 50%; background: var(--tc-raised); font-size: 1.25rem !important; cursor: pointer; }
.tc-mini input { width: 52px; text-align: center; border: 0; background: transparent; font: 700 1.5rem/1 ui-sans-serif, system-ui, sans-serif !important; font-variant-numeric: tabular-nums; }
.tc-switch { appearance: none; border: 0; width: 64px; height: 36px; border-radius: 18px; background: var(--color-kumo-interact, #3a3e44); position: relative; cursor: pointer; }
.tc-switch::after { content: ""; position: absolute; top: 4px; left: 4px; width: 28px; height: 28px; border-radius: 50%; background: #f2f4f6; transition: transform .15s; }
.tc-switch[aria-checked="true"] { background: var(--tc-in); }
.tc-switch[aria-checked="true"]::after { transform: translateX(28px); }
.tc-switch::before { content: ""; position: absolute; inset: -6px; }
.tc-ghost { appearance: none; border: 0; height: var(--tap); border-radius: 12px; background: var(--tc-raised); font-weight: 600 !important; cursor: pointer; }
.tc-picks { display: grid; gap: 4px; max-height: 196px; overflow-y: auto; }
.tc-picks button { appearance: none; border: 0; background: var(--tc-raised); min-height: 44px; border-radius: 10px; text-align: left; padding: 0 12px; cursor: pointer; font-weight: 500; }
.tc .tc-picks button[aria-pressed="true"] { background: var(--tc-go-tint); color: var(--tc-go); font-weight: 650; }

.tc-table { background: var(--tc-card); border: 1px solid var(--color-kumo-line); border-radius: 12px; overflow: hidden; }
.tc-table-head { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--color-kumo-line); }
.tc-table-head strong { font-size: 1.0625rem; }
.tc-table-head span { color: var(--tc-muted); font-size: .875rem; }
.tc-wrap { overflow-x: auto; }
.tc table { border-collapse: collapse; width: 100%; font-size: .9375rem; }
.tc th, .tc td { text-align: right; padding: 10px 20px; border-bottom: 1px solid var(--color-kumo-line); font-variant-numeric: tabular-nums; }
.tc tr:last-child td { border-bottom: 0; }
.tc th:first-child, .tc td:first-child { text-align: left; }
.tc th { font-size: .8125rem; font-weight: 600; color: var(--tc-muted); background: var(--tc-bg); }
.tc td.z { color: var(--tc-muted); opacity: .55; }
.tc td.cab i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: var(--tc-in); }
.tc td.cab i.off { background: transparent; box-shadow: inset 0 0 0 1.5px var(--tc-muted); }
.tc .tc-name { appearance: none; border: 0; background: none; padding: 0; font-weight: 700; cursor: pointer; text-align: left; }
.tc-name:hover { text-decoration: underline; }
.tc-name small { display: block; font-weight: 400; font-size: .8125rem; color: var(--tc-muted); }
.tc td.tc-none { text-align: left; color: var(--tc-muted); }
.tc-log h2 { margin: 0 0 8px; font-size: 1rem; }
.tc-log p { margin: 0 0 6px; color: var(--tc-muted); font-size: .875rem; }

/* Phone: one view at a time. Wide: places beside the overview. */
@container (max-width: 899px) { .tc[data-view="places"] .tc-desk, .tc[data-view="overview"] .tc-places { display: none; } }
@container (max-width: 520px) { .tc th, .tc td { padding: 10px 4px; } .tc th { font-size: .75rem; } .tc th:first-child, .tc td:first-child { padding-left: 14px; } .tc th:last-child, .tc td:last-child { padding-right: 14px; } .tc-table-head { padding: 14px; } }
@container (min-width: 900px) { .tc-grid { grid-template-columns: minmax(340px, 420px) minmax(0, 1fr); } .tc-link { display: none; } }
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
	/** What each change shown in the snackbar did on the server, for its Undo. */
	const went = React.useRef(new Map<number, Change | null>());
	const timer = React.useRef<number | undefined>(undefined);

	const showSnack = (s: Snack) => {
		setSnack(s);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setSnack((now) => (now?.id === s.id ? null : now)), 5000);
	};
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
	const root = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		reload();
		// Section headings stick to the very top of the admin's scrolling area, not below its padding.
		const scroller = root.current?.closest("main");
		if (scroller) root.current!.style.setProperty("--tc-sticky", `-${getComputedStyle(scroller).paddingTop}`);
	}, []);
	React.useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(null);
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	const local = (flavor: string, next: (r: Row) => Tubs | null) => setRows((all) => all && all.map((r) => (r.id === flavor ? { ...r, ...(next(r) ?? r) } : r)));
	/** Queues one request; `body` is read when its turn comes, so an undo can use what the change before it returned. */
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
	const note = (text: string) => showSnack({ id: ++snackId.current, text, note: true });
	const change = (r: Row, c: Change) => {
		setSheet(null);
		const id = ++snackId.current;
		const shown: Change = c.action === "into" ? { ...c, swap: r.cab } : c;
		local(r.id, (now) => applyChange(now, c));
		showSnack({ id, text: changeText(shown, label(r)), flavor: r.id, change: shown });
		post(
			() => ({ flavor: r.id, change: c }),
			(data) => {
				went.current.set(id, data.done?.change ?? null);
				if (data.done) setSnack((s) => (s?.id === id ? { ...s, text: data.done!.text } : s));
				else if (data.failed) note(data.failed);
			},
		);
	};
	// Undo works straight away: it waits in the queue for its change, then sends what the server said went through.
	const undo = () => {
		if (!snack?.flavor || !snack.change) return;
		const { id, flavor, change: c } = snack;
		setSnack(null);
		local(flavor, (now) => undoChange(now, c));
		post(
			() => {
				const done = went.current.get(id);
				return done ? { flavor, undo: done } : null;
			},
			(data) => data.failed && note(data.failed),
		);
	};

	const all = rows ?? [];
	const twin = (r: Row) => !!r.category && all.filter((o) => o.name === r.name).length > 1;
	const label = (r: Row) => (twin(r) ? `${r.name} (${r.category})` : r.name);
	const byId = (id: string) => all.find((r) => r.id === id);

	const elsewhere = (r: Row) => {
		const bits: string[] = [];
		if (twin(r)) bits.push(r.category);
		if (place !== "hard" && r.hard) bits.push(`${r.hard} hardening`);
		if (place !== "back" && r.back) bits.push(`${r.back} in back`);
		if (place !== "front" && r.front) bits.push(`${r.front} in front`);
		if (place !== "cab" && r.cab) bits.push("in the cabinets");
		return bits.join(" · ") || "None anywhere else";
	};
	const pill = (text: string, aria: string, run: () => void, stop = false) => (
		<button type="button" className={stop ? "tc-pill stop" : "tc-pill"} aria-label={aria} onClick={run}>
			{text}
		</button>
	);
	const intoCabinets = (r: Row) =>
		pill("Into cabinets", r.cab ? `Swap a fresh ${label(r)} into the cabinets` : `Put ${label(r)} in the cabinets`, () => change(r, { action: "into" }));
	const actionFor = (r: Row) => {
		if (place === "hard" || place === "back") {
			if (!r[place]) return null;
			const to = placeWords(NEXT[place]);
			return pill(place === "hard" ? "To back" : "To front", `Move 1 ${label(r)} to ${to}`, () => change(r, { action: "move", from: place }));
		}
		if (place === "front") return r.front ? intoCabinets(r) : null;
		if (r.cab) return pill("Used up", `${label(r)} used up`, () => change(r, { action: "usedUp" }), true);
		return r.front ? intoCabinets(r) : null;
	};
	const row = (r: Row) => (
		<div key={r.id} className={has(r, place) ? "tc-row" : "tc-row dim"}>
			{place === "cab" ? (
				<div className="tc-dot" role="img" aria-label={r.cab ? "In the cabinets" : "Not in the cabinets"}>
					<i className={r.cab ? undefined : "off"} />
				</div>
			) : (
				<button type="button" className={r[place] ? "tc-count" : "tc-count tc-quiet"} aria-label={`${label(r)}: ${r[place]} in ${placeWords(place)}. Open ${label(r)}`} onClick={() => setSheet({ kind: "flavor", id: r.id })}>
					{r[place] || "–"}
				</button>
			)}
			<button type="button" className="tc-who" aria-label={`Open ${label(r)}`} onClick={() => setSheet({ kind: "flavor", id: r.id })}>
				<b>{r.name}</b>
				<span>{elsewhere(r)}</span>
			</button>
			{actionFor(r) ?? <span />}
		</div>
	);
	const heading = (text: string, aside?: string) => (
		<div className="tc-group" role="heading" aria-level={2}>
			<span>{text}</span>
			{aside && <span>{aside}</span>}
		</div>
	);

	const q = query.trim().toLowerCase();
	const match = all.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(q));
	const here = match.filter((r) => has(r, place));
	const ready = place === "cab" ? match.filter((r) => !r.cab && r.front) : [];
	const rest = match.filter((r) => !has(r, place) && !ready.includes(r));
	const sum = place === "cab" ? plural(here.length, "flavor") : plural(here.reduce((t, r) => t + r[place], 0), "tub");
	const stocked = all.filter((r) => tubsInAll(r) > 0);

	return (
		<div className="tc" data-view={view} ref={root}>
			<style>{css}</style>
			<div className="tc-grid">
				<section className="tc-places" aria-label="By place">
					<div className="tc-top">
						<h1>Tub counts</h1>
						<button type="button" className="tc-link" onClick={() => setView("overview")}>
							Overview
						</button>
					</div>
					<div className="tc-seg" role="group" aria-label="Where you are">
						{PLACES.map(([p, name]) => (
							<button
								key={p}
								type="button"
								aria-pressed={p === place}
								onClick={() => {
									setPlace(p);
									setShowAll(false);
								}}
							>
								<b>{all.reduce((t, r) => t + (p === "cab" ? (r.cab ? 1 : 0) : r[p]), 0)}</b>
								<span>{name}</span>
							</button>
						))}
					</div>
					<div className="tc-tools">
						{place === "hard" && (
							<button type="button" className="tc-primary" onClick={() => setSheet({ kind: "batch" })}>
								+&nbsp; Made a batch
							</button>
						)}
						<label className="tc-search">
							<SearchIcon />
							<input type="search" placeholder="Find a flavor" aria-label="Find a flavor" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
						</label>
					</div>
					{error && (
						<p className="tc-error" role="alert">
							{error}
						</p>
					)}
					<div aria-live="polite" aria-busy={rows === null}>
						{rows === null && !error && <div className="tc-empty"><span>Loading…</span></div>}
						{rows !== null && (
							<>
								{here.length > 0 && heading(TITLE[place], sum)}
								{here.map(row)}
								{here.length === 0 && !q && (
									<div className="tc-empty">
										<b>{EMPTY_TITLE[place]}</b>
										<span>{EMPTY_HINT[place]}</span>
									</div>
								)}
								{ready.length > 0 && heading("Ready from the front")}
								{ready.map(row)}
								{rest.length > 0 &&
									(showAll || q ? (
										<>
											{heading("Other flavors", String(rest.length))}
											{rest.map(row)}
										</>
									) : (
										<button type="button" className="tc-more" onClick={() => setShowAll(true)}>
											Show all flavors ({rest.length} more)
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

				<section className="tc-desk" aria-label="Overview">
					<div className="tc-top">
						<h1>Overview</h1>
						<button type="button" className="tc-link" onClick={() => setView("places")}>
							By place
						</button>
					</div>
					<div className="tc-table">
						<div className="tc-table-head">
							<strong>What we have</strong>
							<span>A–Z · a dash means none</span>
						</div>
						<div className="tc-wrap">
							<table>
								<thead>
									<tr>
										<th scope="col">Flavor</th>
										<th scope="col">Hardening</th>
										<th scope="col">Back</th>
										<th scope="col">Front</th>
										<th scope="col">Cabinets</th>
									</tr>
								</thead>
								<tbody>
									{stocked.map((r) => (
										<tr key={r.id}>
											<td>
												<button type="button" className="tc-name" onClick={() => setSheet({ kind: "flavor", id: r.id })}>
													{r.name}
													{twin(r) && <small>{r.category}</small>}
												</button>
											</td>
											{(["hard", "back", "front"] as const).map((k) =>
												r[k] ? (
													<td key={k}>{r[k]}</td>
												) : (
													<td key={k} className="z" aria-label="none">
														–
													</td>
												),
											)}
											<td className="cab">
												<i className={r.cab ? undefined : "off"} role="img" aria-label={r.cab ? "In the cabinets" : "Not in the cabinets"} />
											</td>
										</tr>
									))}
									{rows !== null && stocked.length === 0 && (
										<tr>
											<td colSpan={5} className="tc-none">
												No tubs anywhere yet.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
					<section className="tc-log" aria-label="Recent changes">
						<h2>Recent changes</h2>
						{log.length === 0 ? <p>No changes yet.</p> : log.map((c) => <p key={c.at + c.text}>{when(c.at)} · {c.text}{c.by && ` · ${c.by}`}</p>)}
					</section>
				</section>
			</div>

			{snack && (
				<div className="tc-snack" role="status">
					<span>{snack.text}</span>
					{!snack.note && (
						<button type="button" onClick={undo}>
							Undo
						</button>
					)}
				</div>
			)}
			{sheet && (
				<div className="tc-scrim" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
					{sheet.kind === "flavor" && byId(sheet.id) && <FlavorSheet row={byId(sheet.id)!} title={label(byId(sheet.id)!)} onCancel={() => setSheet(null)} onSave={(to) => change(byId(sheet.id)!, { action: "save", to })} />}
					{sheet.kind === "batch" && <BatchSheet rows={all} label={label} onAdd={(r, count) => change(r, { action: "batch", count })} />}
				</div>
			)}
		</div>
	);
}

/** Puts focus in a sheet when it opens. */
const useFocusFirst = () => {
	const ref = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		ref.current?.querySelector<HTMLElement>("input, button")?.focus();
	}, []);
	return ref;
};
const clamp = (n: number, min: number) => Math.min(MAX_COUNT, Math.max(min, Number.isFinite(n) ? Math.trunc(n) : min));

function FlavorSheet({ row, title, onCancel, onSave }: { row: Row; title: string; onCancel: () => void; onSave: (to: Tubs) => void }) {
	const [draft, setDraft] = React.useState<Tubs>({ hard: row.hard, back: row.back, front: row.front, cab: row.cab });
	const ref = useFocusFirst();
	const inAll = tubsInAll(row);
	const fields: Array<[keyof Omit<Tubs, "cab">, string, string]> = [["hard", "Hardening", "Just made"], ["back", "Back freezer", ""], ["front", "Front freezer", ""]];
	const save = () => {
		const same = (["hard", "back", "front", "cab"] as const).every((k) => draft[k] === row[k]);
		if (same) onCancel();
		else onSave(draft);
	};
	return (
		<div className="tc-sheet" role="dialog" aria-modal="true" aria-labelledby="tc-sheet-title" ref={ref}>
			<div className="tc-grip" />
			<h2 id="tc-sheet-title">
				{title}
				<span>{`${plural(inAll, "tub")} in all. Set any count, then Save.`}</span>
			</h2>
			<div>
				{fields.map(([k, name, hint]) => (
					<div className="tc-field" key={k}>
						<label htmlFor={`tc-${k}`}>
							{name}
							{hint && <span>{hint}</span>}
						</label>
						<div className="tc-mini">
							<button type="button" aria-label={`One fewer, ${name}`} onClick={() => setDraft((d) => ({ ...d, [k]: clamp(d[k] - 1, 0) }))}>
								−
							</button>
							<input
								id={`tc-${k}`}
								inputMode="numeric"
								value={draft[k]}
								onFocus={(e) => e.currentTarget.select()}
								onChange={(e) => setDraft((d) => ({ ...d, [k]: clamp(parseInt(e.target.value, 10) || 0, 0) }))}
							/>
							<button type="button" aria-label={`One more, ${name}`} onClick={() => setDraft((d) => ({ ...d, [k]: clamp(d[k] + 1, 0) }))}>
								+
							</button>
						</div>
					</div>
				))}
				<div className="tc-field">
					<label htmlFor="tc-cab">
						Cabinets<span>One tub in its slot</span>
					</label>
					<button type="button" className="tc-switch" id="tc-cab" role="switch" aria-checked={draft.cab} aria-label="In the cabinets" onClick={() => setDraft((d) => ({ ...d, cab: !d.cab }))} />
				</div>
			</div>
			<div className="tc-acts">
				<button type="button" className="tc-ghost" onClick={onCancel}>
					Cancel
				</button>
				<button type="button" className="tc-primary" onClick={save}>
					Save
				</button>
			</div>
		</div>
	);
}

function BatchSheet({ rows, label, onAdd }: { rows: Row[]; label: (r: Row) => string; onAdd: (r: Row, count: number) => void }) {
	const [find, setFind] = React.useState("");
	const [pick, setPick] = React.useState<string | null>(null);
	const [count, setCount] = React.useState("1");
	const ref = useFocusFirst();
	const q = find.trim().toLowerCase();
	const picks = rows.filter((r) => `${r.name} ${r.category}`.toLowerCase().includes(q)).slice(0, 6);
	const chosen = rows.find((r) => r.id === pick);
	const n = clamp(parseInt(count, 10) || 1, 1);
	return (
		<div className="tc-sheet" role="dialog" aria-modal="true" aria-labelledby="tc-batch-title" ref={ref}>
			<div className="tc-grip" />
			<h2 id="tc-batch-title">Made a batch</h2>
			<label className="tc-search">
				<SearchIcon />
				<input placeholder="Which flavor?" aria-label="Which flavor?" autoComplete="off" value={find} onChange={(e) => setFind(e.target.value)} />
			</label>
			<div className="tc-picks">
				{picks.map((r) => (
					<button key={r.id} type="button" aria-pressed={pick === r.id} onClick={() => setPick(r.id)}>
						{label(r)}
					</button>
				))}
			</div>
			<div className="tc-big">
				<button type="button" aria-label="One fewer" onClick={() => setCount(String(clamp(n - 1, 1)))}>
					−
				</button>
				<input inputMode="numeric" aria-label="Number of tubs" value={count} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setCount(e.target.value.replace(/\D/g, "").slice(0, 3))} onBlur={() => setCount(String(n))} />
				<button type="button" aria-label="One more" onClick={() => setCount(String(clamp(n + 1, 1)))}>
					+
				</button>
			</div>
			<button type="button" className="tc-primary" disabled={!chosen} onClick={() => chosen && onAdd(chosen, n)}>
				Add to Hardening
			</button>
		</div>
	);
}
