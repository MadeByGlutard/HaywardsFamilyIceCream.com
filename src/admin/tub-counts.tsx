import * as React from "react";

interface Row { id: string; name: string; category: string; back: number; ready: number; tomorrow: number; front: number; status: Status }
interface Change { at: string; text: string; by: string }
type Status = "Back, ready tomorrow" | "Move from back" | "In front" | "Last one in front" | "Out";
type Action = "back+" | "back-" | "move" | "front+" | "front-" | "case" | "last";

const URL = "/_emdash/api/plugins/haywards-admin/tubs";
const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };
const MAX_BATCH = 50;

/** Times in Milford, wherever the phone thinks it is. */
const zone = { timeZone: "America/New_York" } as const;
const when = (at: string) => {
	const d = new Date(at);
	const day = (x: Date) => x.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
	const time = d.toLocaleTimeString("en-US", { ...zone, hour: "numeric", minute: "2-digit" });
	return day(new Date()) === day(d) ? `Today ${time}` : `${day(d)}, ${time}`;
};
const tomorrow = () => new Date(Date.now() + 864e5).toLocaleDateString("en-US", { ...zone, weekday: "long" });

/** "Back 5 (2 ready) → Front 3" */
const summary = (r: Row) => {
	const ready = r.back === 0 ? "" : r.ready === 0 ? " (ready tomorrow)" : r.tomorrow === 0 ? " (ready)" : ` (${r.ready} ready)`;
	return `Back ${r.back}${ready} → Front ${r.front}`;
};

/** The lists, in the order work happens. Out is separate, folded up at the bottom. */
const LISTS: Array<{ status: Status; title: string; note?: string }> = [
	{ status: "Move from back", title: "Move from the back", note: "Nothing up front. These have tubs ready in the back." },
	{ status: "Last one in front", title: "Last one in front", note: "Heads up: one tub left up front." },
	{ status: "In front", title: "In front" },
	{ status: "Back, ready tomorrow", title: "In the back, ready tomorrow", note: "Made today. Ready to move to the front tomorrow." },
];

const css = `
.tubs { max-width: 760px; display: grid; gap: 24px; font-size: 15px; }
.tubs h1 { margin: 0; font-size: 28px; font-weight: 650; }
.tubs h2 { margin: 0; font-size: 18px; font-weight: 650; }
.tubs-lead, .tubs-note, .tubs-sub, .tubs-sum { color: var(--text-color-kumo-subtle); }
.tubs-lead { margin: 4px 0 0; max-width: 60ch; }
.tubs button, .tubs input { font: inherit; }
.tubs button { cursor: pointer; }
.tubs button:disabled { opacity: .4; cursor: not-allowed; }
.tubs-panel { border: 1px solid var(--color-kumo-line); border-radius: 12px; background: var(--color-kumo-base); }
.tubs-batch { padding: 16px; display: grid; gap: 12px; }
.tubs-batch form { display: grid; grid-template-columns: minmax(0, 1fr) 6rem auto; gap: 10px; align-items: end; }
.tubs-field { display: grid; gap: 4px; font-size: 13px; font-weight: 600; color: var(--text-color-kumo-subtle); }
.tubs-field input { min-height: 48px; padding: 0 12px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); color: var(--text-color-kumo-default); font-size: 16px; min-width: 0; }
.tubs-big { min-height: 48px; padding: 0 18px; border: 0; border-radius: 10px; background: var(--text-color-kumo-default); color: var(--color-kumo-base); font-weight: 700; white-space: nowrap; }
.tubs-plain { min-height: 48px; padding: 0 16px; border: 1px solid var(--text-color-kumo-default); border-radius: 10px; background: transparent; color: inherit; font-weight: 700; white-space: nowrap; }
.tubs-list { display: grid; gap: 8px; }
.tubs-list > header { display: grid; gap: 2px; }
.tubs-note { margin: 0; font-size: 14px; }
.tubs-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; align-items: center; padding: 12px 14px; border-top: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); }
.tubs-line:first-child { border-top: 0; }
.tubs-what { display: grid; gap: 2px; min-width: 0; }
.tubs-what strong { font-size: 16px; }
.tubs-sub { font-weight: 400; font-size: 13px; }
.tubs-sum { font-size: 14px; font-variant-numeric: tabular-nums; }
.tubs-fixlink { justify-self: start; min-height: 32px; padding: 0; border: 0; background: none; color: var(--text-color-kumo-subtle); text-decoration: underline; font-size: 13px; }
.tubs-wait { font-size: 14px; font-weight: 600; text-align: right; }
.tubs-fix { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px 20px; padding-top: 4px; }
.tubs-count { display: inline-flex; align-items: center; gap: 6px; }
.tubs-count > span { min-width: 3rem; font-size: 13px; color: var(--text-color-kumo-subtle); }
.tubs-count output { min-width: 2ch; text-align: center; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tubs-step { width: 44px; height: 44px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-size: 20px; line-height: 1; }
.tubs-addone { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 10px; align-items: end; }
.tubs-addone .tubs-field input { width: 6rem; }
.tubs-out > summary { cursor: pointer; padding: 14px; min-height: 48px; box-sizing: border-box; font-weight: 650; font-size: 18px; }
.tubs-out[open] > summary { border-bottom: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); }
.tubs-outline > summary { cursor: pointer; padding: 12px 14px; min-height: 48px; box-sizing: border-box; display: flex; gap: 8px; align-items: baseline; }
.tubs-outline > summary::after { content: "Add a batch ›"; margin-left: auto; color: var(--text-color-kumo-subtle); font-size: 13px; white-space: nowrap; }
.tubs-outline[open] > summary::after { content: "Close"; }
.tubs-outline > summary::-webkit-details-marker { display: none; }
.tubs-outline + .tubs-outline { border-top: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); }
.tubs-outline > .tubs-line { border-top: 0; padding-top: 0; }
.tubs-msg { margin: 0; padding: 10px 14px; border-radius: 8px; font-weight: 600; }
.tubs-msg.notice { background: #fbe7d2; color: #7a3d00; }
.tubs-msg.done { background: #e3efe7; color: #1f4a37; }
.tubs-msg.error { background: #f8dcdc; color: #7a1020; }
.tubs-changes { display: grid; gap: 6px; }
.tubs-changes p { margin: 0; color: var(--text-color-kumo-subtle); font-size: 14px; }
.tubs-empty { margin: 0; padding: 14px; }
@media (max-width: 560px) {
	.tubs-batch form { grid-template-columns: minmax(0, 1fr) 5.5rem; }
	.tubs-batch form .tubs-big { grid-column: 1 / -1; }
	.tubs-line { grid-template-columns: minmax(0, 1fr); }
	.tubs-line .tubs-big, .tubs-line .tubs-plain { width: 100%; }
	.tubs-wait { text-align: left; }
}
`;

export function TubCounts() {
	const [rows, setRows] = React.useState<Row[] | null>(null);
	const [changes, setChanges] = React.useState<Change[]>([]);
	const [busy, setBusy] = React.useState(false);
	const [message, setMessage] = React.useState<{ kind: "notice" | "done" | "error"; text: string } | null>(null);
	const [fixing, setFixing] = React.useState<string | null>(null);
	const [flavor, setFlavor] = React.useState("");
	const [tubs, setTubs] = React.useState("1");

	const all = rows ?? [];
	const twin = (r: Row) => all.filter((o) => o.name === r.name).length > 1;
	const label = (r: Row) => (twin(r) ? `${r.name} (${r.category})` : r.name);

	const load = React.useCallback(async (response: Response, done?: string) => {
		const body = (await response.json()) as { data?: { rows: Row[]; changes: Change[]; notice?: string }; error?: { message?: string } };
		if (!response.ok || !body.data) throw new Error(body.error?.message || "Couldn’t load the counts.");
		setRows(body.data.rows);
		setChanges(body.data.changes);
		setMessage(body.data.notice ? { kind: "notice", text: body.data.notice } : done ? { kind: "done", text: done } : null);
	}, []);
	React.useEffect(() => {
		fetch(URL, { headers }).then((r) => load(r)).catch((e) => setMessage({ kind: "error", text: e.message }));
	}, [load]);

	const act = (row: Row, action: Action, count = 1, done?: string) => {
		setBusy(true);
		return fetch(URL, { method: "POST", headers, body: JSON.stringify({ flavor: row.id, action, count }) })
			.then((r) => load(r, done))
			.catch((e) => setMessage({ kind: "error", text: e.message }))
			.finally(() => setBusy(false));
	};
	const addBatch = (row: Row, raw: string) => {
		const n = Math.trunc(Number(raw));
		if (!(n >= 1 && n <= MAX_BATCH)) return setMessage({ kind: "error", text: `Enter 1 to ${MAX_BATCH} tubs.` });
		return act(row, "back+", n, `${n} ${label(row)} into the back. Ready to move tomorrow.`);
	};
	const submitBatch = (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		const typed = flavor.trim().toLowerCase();
		const row = all.find((r) => label(r).toLowerCase() === typed);
		if (!row) return setMessage({ kind: "error", text: "Pick a flavor from the list." });
		addBatch(row, tubs)?.then(() => {
			setFlavor("");
			setTubs("1");
		});
	};

	const name = (r: Row) => (
		<strong>
			{r.name}
			{(twin(r) || r.category !== "Ice cream") && <span className="tubs-sub"> · {r.category}</span>}
		</strong>
	);
	const fixLink = (r: Row) => (
		<button type="button" className="tubs-fixlink" aria-expanded={fixing === r.id} onClick={() => setFixing(fixing === r.id ? null : r.id)}>
			{fixing === r.id ? "Done fixing" : "Fix count"}
		</button>
	);
	const stepper = (r: Row, where: "back" | "front") => (
		<span className="tubs-count">
			<span>{where === "back" ? "Back" : "Front"}</span>
			<button type="button" className="tubs-step" aria-label={`One fewer ${r.name} in the ${where} freezer`} disabled={busy || r[where] < 1} onClick={() => act(r, `${where}-`)}>−</button>
			<output aria-label={`${r.name}, ${where} freezer`}>{r[where]}</output>
			<button type="button" className="tubs-step" aria-label={`One more ${r.name} in the ${where} freezer`} disabled={busy} onClick={() => act(r, `${where}+`)}>+</button>
		</span>
	);
	/** Only the next sensible thing to do with this flavor. */
	const next = (r: Row) => {
		switch (r.status) {
			case "Move from back":
				return <button type="button" className="tubs-big" disabled={busy} onClick={() => act(r, "move")}>Move 1 to front</button>;
			case "Last one in front":
				return <button type="button" className="tubs-plain" disabled={busy} onClick={() => act(r, "last")}>Last one out of front</button>;
			case "In front":
				return <button type="button" className="tubs-big" disabled={busy} onClick={() => act(r, "case")}>Into the case</button>;
			case "Back, ready tomorrow":
				return <span className="tubs-wait">Ready {tomorrow()}</span>;
			default:
				return null;
		}
	};
	const line = (r: Row) => (
		<div className="tubs-line" key={r.id}>
			<span className="tubs-what">
				{name(r)}
				<span className="tubs-sum">{summary(r)}</span>
				{fixLink(r)}
			</span>
			{next(r)}
			{fixing === r.id && <span className="tubs-fix">{stepper(r, "back")}{stepper(r, "front")}</span>}
		</div>
	);
	const out = all.filter((r) => r.status === "Out");

	return (
		<div className="tubs">
			<style>{css}</style>
			<div>
				<h1>Tub counts</h1>
				<p className="tubs-lead">Staff only. This never changes the website. Tubs go from the back freezer (ready the next day, Milford time) to the front freezer, then into the case.</p>
			</div>

			<section className="tubs-panel tubs-batch" aria-labelledby="tubs-batch">
				<h2 id="tubs-batch">Made a batch</h2>
				<form onSubmit={submitBatch}>
					<label className="tubs-field">
						Flavor
						<input list="tubs-flavors" value={flavor} onChange={(e) => setFlavor(e.target.value)} placeholder="Start typing…" autoComplete="off" required />
					</label>
					<label className="tubs-field">
						Tubs
						<input type="number" inputMode="numeric" min={1} max={MAX_BATCH} value={tubs} onChange={(e) => setTubs(e.target.value)} required />
					</label>
					<button type="submit" className="tubs-big" disabled={busy || rows === null}>Add to back</button>
					<datalist id="tubs-flavors">{all.map((r) => <option key={r.id} value={label(r)} />)}</datalist>
				</form>
			</section>

			{message && <p className={`tubs-msg ${message.kind}`} role={message.kind === "error" ? "alert" : "status"}>{message.text}</p>}
			{rows === null && !message && <p className="tubs-empty">Loading…</p>}

			{LISTS.map(({ status, title, note }) => {
				const list = all.filter((r) => r.status === status);
				if (list.length === 0) return null;
				return (
					<section className="tubs-list" key={status} aria-label={title}>
						<header>
							<h2>{title} ({list.length})</h2>
							{note && <p className="tubs-note">{note}</p>}
						</header>
						<div className="tubs-panel">{list.map(line)}</div>
					</section>
				);
			})}

			{out.length > 0 && (
				<details className="tubs-panel tubs-out">
					<summary>Out ({out.length})</summary>
					{out.map((r) => (
						<details className="tubs-outline" key={r.id}>
							<summary>{name(r)}</summary>
							<OutLine busy={busy} onAdd={(n) => addBatch(r, n)} />
							<div className="tubs-line">
								{fixLink(r)}
								{fixing === r.id && <span className="tubs-fix">{stepper(r, "back")}{stepper(r, "front")}</span>}
							</div>
						</details>
					))}
				</details>
			)}

			<section className="tubs-changes" aria-label="Recent changes" aria-live="polite">
				<h2>Recent changes</h2>
				{changes.length === 0 ? <p>No changes yet.</p> : changes.map((c) => <p key={c.at + c.text}>{when(c.at)} · {c.text}{c.by && ` · ${c.by}`}</p>)}
			</section>
		</div>
	);
}

/** Add a batch to a flavor that's out, from inside the Out list. */
function OutLine({ busy, onAdd }: { busy: boolean; onAdd: (tubs: string) => unknown }) {
	const [tubs, setTubs] = React.useState("1");
	return (
		<div className="tubs-line">
			<span className="tubs-addone">
				<label className="tubs-field">
					Tubs made
					<input type="number" inputMode="numeric" min={1} max={MAX_BATCH} value={tubs} onChange={(e) => setTubs(e.target.value)} />
				</label>
				<button type="button" className="tubs-big" disabled={busy} onClick={() => onAdd(tubs)}>Add to back</button>
			</span>
		</div>
	);
}
