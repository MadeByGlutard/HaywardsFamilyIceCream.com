import * as React from "react";

interface Row { id: string; name: string; category: string; front: number; back: number }
interface Change { at: string; text: string; by: string }
type Action = "front+" | "front-" | "back+" | "back-" | "case" | "move";
type View = "all" | "move" | "out";

const URL = "/_emdash/api/plugins/haywards-admin/tubs";
const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };

/** The mockup's four states, from the front and back counts. */
const statusOf = (r: Row) => (r.front > 0 ? (r.front === 1 && r.back === 0 ? "Last tub" : "Up front") : r.back > 0 ? "Move from back" : "Out");

const when = (at: string) => {
	const d = new Date(at);
	const today = new Date().toDateString() === d.toDateString();
	const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
	return today ? `Today ${time}` : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${time}`;
};

const css = `
.tubs { max-width: 1180px; display: grid; gap: 20px; font-size: 14px; }
.tubs h1 { margin: 0; font-size: 28px; font-weight: 650; }
.tubs-lead { margin: 4px 0 0; color: var(--text-color-kumo-subtle); max-width: 60ch; }
.tubs-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
.tubs-views { display: flex; flex-wrap: wrap; gap: 8px; }
.tubs button { font: inherit; cursor: pointer; }
.tubs-view { min-height: 40px; padding: 0 14px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-weight: 600; }
.tubs-view[aria-pressed="true"] { background: var(--text-color-kumo-default); color: var(--color-kumo-base); border-color: transparent; }
.tubs-totals { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.tubs-total { padding: 12px 14px; border: 1px solid var(--color-kumo-line); border-radius: 10px; background: var(--color-kumo-base); display: grid; gap: 4px; }
.tubs-total span { color: var(--text-color-kumo-subtle); }
.tubs-total strong { font-size: 24px; }
.tubs-table { border: 1px solid var(--color-kumo-line); border-radius: 10px; background: var(--color-kumo-base); overflow: hidden; }
.tubs-row { display: grid; grid-template-columns: minmax(10rem, 1.4fr) auto auto minmax(14rem, 1fr) 8.5rem; gap: 16px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); }
.tubs-row:first-child { border-top: 0; }
.tubs-labels { color: var(--text-color-kumo-subtle); font-size: 12px; font-weight: 600; }
.tubs-name strong { display: block; font-size: 15px; }
.tubs-name span { color: var(--text-color-kumo-subtle); font-size: 12px; }
.tubs-count { display: inline-flex; align-items: center; gap: 6px; }
.tubs-count output { min-width: 2ch; text-align: center; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tubs-step { width: 40px; height: 40px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-size: 20px; line-height: 1; }
.tubs-step:disabled, .tubs-act:disabled { opacity: .4; cursor: default; }
.tubs-where { display: none; color: var(--text-color-kumo-subtle); font-size: 12px; }
.tubs-acts { display: flex; flex-wrap: wrap; gap: 6px; }
.tubs-act { min-height: 40px; padding: 0 12px; border: 1px solid var(--text-color-kumo-default); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-weight: 600; }
.tubs-act.primary { background: var(--text-color-kumo-default); color: var(--color-kumo-base); }
.tubs-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.tubs-badge.up { background: #e3efe7; color: #1f4a37; }
.tubs-badge.last { border: 1px solid currentColor; }
.tubs-badge.move { background: #fbe7d2; color: #7a3d00; }
.tubs-badge.out { background: #a71d2a; color: #fffdf8; }
.tubs-changes { display: grid; gap: 6px; }
.tubs-changes h2 { margin: 0 0 4px; font-size: 16px; }
.tubs-changes p { margin: 0; color: var(--text-color-kumo-subtle); }
.tubs-empty, .tubs-error { padding: 16px; margin: 0; }
.tubs-error { color: var(--text-color-kumo-danger); }
@media (max-width: 900px) {
	.tubs-totals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.tubs-labels { display: none; }
	.tubs-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: "name badge" "front back" "acts acts"; gap: 10px; padding: 14px; }
	.tubs-name { grid-area: name; } .tubs-badge-cell { grid-area: badge; justify-self: end; }
	.tubs-front { grid-area: front; } .tubs-back { grid-area: back; }
	.tubs-acts { grid-area: acts; } .tubs-acts .tubs-act { flex: 1 1 8rem; min-height: 44px; }
	.tubs-count { flex-wrap: wrap; row-gap: 4px; }
	.tubs-where { display: block; flex-basis: 100%; }
	.tubs-step { width: 44px; height: 44px; }
	.tubs-view { min-height: 44px; }
}
`;

export function TubCounts() {
	const [rows, setRows] = React.useState<Row[] | null>(null);
	const [changes, setChanges] = React.useState<Change[]>([]);
	const [view, setView] = React.useState<View>("all");
	const [busy, setBusy] = React.useState<string | null>(null);
	const [error, setError] = React.useState("");

	const take = async (response: Response) => {
		const body = (await response.json()) as { data?: { rows: Row[]; changes: Change[] }; error?: { message?: string } };
		if (!response.ok || !body.data) throw new Error(body.error?.message || "Couldn’t load the counts.");
		setRows(body.data.rows);
		setChanges(body.data.changes);
		setError("");
	};
	React.useEffect(() => {
		fetch(URL, { headers }).then(take).catch((e) => setError(e.message));
	}, []);
	const act = (row: Row, action: Action) => {
		setBusy(row.id + action);
		fetch(URL, { method: "POST", headers, body: JSON.stringify({ flavor: row.id, action }) })
			.then(take)
			.catch((e) => setError(e.message))
			.finally(() => setBusy(null));
	};

	const all = (rows ?? []).map((r) => ({ ...r, status: statusOf(r) }));
	const count = (status: string) => all.filter((r) => r.status === status).length;
	const shown = all.filter((r) => view === "all" || (view === "move" && r.status === "Move from back") || (view === "out" && r.status === "Out"));
	const twin = (r: Row) => all.filter((o) => o.name === r.name).length > 1;
	const badge = { "Up front": "up", "Last tub": "last", "Move from back": "move", Out: "out" } as Record<string, string>;
	const counter = (r: Row, where: "front" | "back") => (
		<span className={`tubs-count tubs-${where}`}>
			<span className="tubs-where">{where === "front" ? "Front" : "Back"}</span>
			<button type="button" className="tubs-step" aria-label={`Remove one ${r.name} tub from the ${where} freezer`} disabled={!!busy || r[where] < 1} onClick={() => act(r, `${where}-` as Action)}>−</button>
			<output aria-label={`${r.name}, ${where} freezer`}>{r[where]}</output>
			<button type="button" className="tubs-step" aria-label={`Add one ${r.name} tub to the ${where} freezer`} disabled={!!busy} onClick={() => act(r, `${where}+` as Action)}>+</button>
		</span>
	);

	return (
		<div className="tubs">
			<style>{css}</style>
			<div className="tubs-head">
				<div>
					<h1>Tub counts</h1>
					<p className="tubs-lead">Staff only, in tubs. This never changes the website. Tap “Into the case” when a tub goes in the dipping case.</p>
				</div>
				<div className="tubs-views" role="group" aria-label="Show">
					<button type="button" className="tubs-view" aria-pressed={view === "all"} onClick={() => setView("all")}>All flavors</button>
					<button type="button" className="tubs-view" aria-pressed={view === "move"} onClick={() => setView("move")}>Needs moving ({count("Move from back")})</button>
					<button type="button" className="tubs-view" aria-pressed={view === "out"} onClick={() => setView("out")}>Out ({count("Out")})</button>
				</div>
			</div>
			<div className="tubs-totals">
				<div className="tubs-total"><span>Stocked up front</span><strong>{all.filter((r) => r.front > 0).length}</strong></div>
				<div className="tubs-total"><span>Only in the back, move up</span><strong>{count("Move from back")}</strong></div>
				<div className="tubs-total"><span>Last tub up front</span><strong>{count("Last tub")}</strong></div>
				<div className="tubs-total"><span>Out everywhere</span><strong>{count("Out")}</strong></div>
			</div>
			{error && <p className="tubs-error" role="alert">{error}</p>}
			<section className="tubs-table" aria-label="Flavor counts" aria-busy={rows === null}>
				<div className="tubs-row tubs-labels" aria-hidden="true"><span>Flavor</span><span>Front freezer</span><span>Back freezer</span><span>Quick actions</span><span>Status</span></div>
				{rows === null && !error && <p className="tubs-empty">Loading…</p>}
				{rows !== null && shown.length === 0 && <p className="tubs-empty">Nothing here right now.</p>}
				{shown.map((r) => (
					<div className="tubs-row" key={r.id}>
						<span className="tubs-name"><strong>{r.name}</strong>{(twin(r) || r.category !== "Ice cream") && <span>{r.category}</span>}</span>
						{counter(r, "front")}
						{counter(r, "back")}
						<span className="tubs-acts">
							<button type="button" className="tubs-act primary" disabled={!!busy || r.front + r.back < 1} onClick={() => act(r, "case")}>Into the case</button>
							<button type="button" className="tubs-act" disabled={!!busy || r.back < 1} onClick={() => act(r, "move")}>Back to front</button>
						</span>
						<span className="tubs-badge-cell"><span className={`tubs-badge ${badge[r.status]}`}>{r.status}</span></span>
					</div>
				))}
			</section>
			<section className="tubs-changes" aria-label="Recent changes" aria-live="polite">
				<h2>Recent changes</h2>
				{changes.length === 0 ? <p>No changes yet.</p> : changes.map((c) => <p key={c.at + c.text}>{when(c.at)} · {c.text}{c.by && ` · ${c.by}`}</p>)}
			</section>
		</div>
	);
}
