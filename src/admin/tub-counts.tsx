import * as React from "react";

interface Row { id: string; name: string; category: string; back: number; ready: number; tomorrow: number; front: number; status: Status }
interface Change { at: string; text: string; by: string }
type Status = "Back, ready tomorrow" | "Move from back" | "In front" | "Last one in front" | "Out";
type Action = "back+" | "back-" | "move" | "front+" | "front-" | "case" | "last";
type View = "all" | "move" | "out";

const URL = "/_emdash/api/plugins/haywards-admin/tubs";
const headers = { "Content-Type": "application/json", "X-EmDash-Request": "1" };

/** Times in Milford, wherever the phone thinks it is. */
const zone = { timeZone: "America/New_York" } as const;
const when = (at: string) => {
	const d = new Date(at);
	const day = (x: Date) => x.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
	const time = d.toLocaleTimeString("en-US", { ...zone, hour: "numeric", minute: "2-digit" });
	return day(new Date()) === day(d) ? `Today ${time}` : `${day(d)}, ${time}`;
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
.tubs-row { display: grid; grid-template-columns: minmax(8rem, 1fr) 13rem 7.5rem minmax(14rem, 25rem) 10rem; gap: 16px; align-items: center; padding: 10px 16px; border-top: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); }
.tubs-row:first-child { border-top: 0; }
.tubs-labels { color: var(--text-color-kumo-subtle); font-size: 12px; font-weight: 600; }
.tubs-name strong { display: block; font-size: 15px; }
.tubs-name span { color: var(--text-color-kumo-subtle); font-size: 12px; }
.tubs-count { display: inline-flex; align-items: center; gap: 6px; }
.tubs-count output { min-width: 2ch; text-align: center; font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tubs-step { width: 40px; height: 40px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-size: 20px; line-height: 1; }
.tubs-step:disabled, .tubs-act:disabled { opacity: .4; cursor: default; }
.tubs-where { display: none; color: var(--text-color-kumo-subtle); font-size: 12px; }
.tubs-cell { display: grid; gap: 4px; }
.tubs-ready { color: var(--text-color-kumo-subtle); font-size: 12px; }
.tubs-step.wide { width: auto; padding: 0 10px; font-size: 15px; font-weight: 700; }
.tubs-notice { margin: 0; padding: 10px 14px; border-radius: 8px; background: #fbe7d2; color: #7a3d00; font-weight: 600; }
.tubs-acts { display: flex; flex-wrap: wrap; gap: 6px; }
@media (min-width: 1200px) { .tubs-acts { flex-wrap: nowrap; } .tubs-act { white-space: nowrap; } }
.tubs-act { min-height: 40px; padding: 0 12px; border: 1px solid var(--text-color-kumo-default); border-radius: 8px; background: var(--color-kumo-base); color: inherit; font-weight: 600; }
.tubs-act.primary { background: var(--text-color-kumo-default); color: var(--color-kumo-base); }
.tubs-badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.tubs-badge.wait { background: #e8e4f3; color: #3b2f6b; }
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
	.tubs-row { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name badge" "back back" "front front" "acts acts"; gap: 10px; padding: 14px; }
	.tubs-name { grid-area: name; } .tubs-badge-cell { grid-area: badge; justify-self: end; }
	.tubs-badge { white-space: nowrap; }
	.tubs-front { grid-area: front; } .tubs-back { grid-area: back; }
	.tubs-where { display: block; width: 7rem; }
	.tubs-ready { padding-left: 7.4rem; }
	.tubs-acts { grid-area: acts; } .tubs-acts .tubs-act { flex: 1 1 8rem; min-height: 44px; }
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
	const [notice, setNotice] = React.useState("");

	const take = async (response: Response) => {
		const body = (await response.json()) as { data?: { rows: Row[]; changes: Change[]; notice?: string }; error?: { message?: string } };
		if (!response.ok || !body.data) throw new Error(body.error?.message || "Couldn’t load the counts.");
		setRows(body.data.rows);
		setChanges(body.data.changes);
		setNotice(body.data.notice ?? "");
		setError("");
	};
	React.useEffect(() => {
		fetch(URL, { headers }).then(take).catch((e) => setError(e.message));
	}, []);
	const act = (row: Row, action: Action, count = 1) => {
		setBusy(row.id + action);
		fetch(URL, { method: "POST", headers, body: JSON.stringify({ flavor: row.id, action, count }) })
			.then(take)
			.catch((e) => setError(e.message))
			.finally(() => setBusy(null));
	};

	const all = rows ?? [];
	const count = (status: Status) => all.filter((r) => r.status === status).length;
	const shown = all.filter((r) => view === "all" || (view === "move" && r.status === "Move from back") || (view === "out" && r.status === "Out"));
	const twin = (r: Row) => all.filter((o) => o.name === r.name).length > 1;
	const badge: Record<Status, string> = { "Back, ready tomorrow": "wait", "Move from back": "move", "In front": "up", "Last one in front": "last", Out: "out" };
	const step = (r: Row, action: Action, label: string, text: string, disabled = false, n = 1) => (
		<button type="button" className={`tubs-step${text.length > 1 ? " wide" : ""}`} aria-label={label} disabled={!!busy || disabled} onClick={() => act(r, action, n)}>{text}</button>
	);

	return (
		<div className="tubs">
			<style>{css}</style>
			<div className="tubs-head">
				<div>
					<h1>Tub counts</h1>
					<p className="tubs-lead">Staff only, in tubs. This never changes the website. New tubs go in the back freezer and can move to the front from the next day (Milford time), then into the case.</p>
				</div>
				<div className="tubs-views" role="group" aria-label="Show">
					<button type="button" className="tubs-view" aria-pressed={view === "all"} onClick={() => setView("all")}>All flavors</button>
					<button type="button" className="tubs-view" aria-pressed={view === "move"} onClick={() => setView("move")}>Move from back ({count("Move from back")})</button>
					<button type="button" className="tubs-view" aria-pressed={view === "out"} onClick={() => setView("out")}>Out ({count("Out")})</button>
				</div>
			</div>
			<div className="tubs-totals">
				<div className="tubs-total"><span>Back, ready tomorrow</span><strong>{count("Back, ready tomorrow")}</strong></div>
				<div className="tubs-total"><span>Move from back</span><strong>{count("Move from back")}</strong></div>
				<div className="tubs-total"><span>Last one in front</span><strong>{count("Last one in front")}</strong></div>
				<div className="tubs-total"><span>Out everywhere</span><strong>{count("Out")}</strong></div>
			</div>
			{error && <p className="tubs-error" role="alert">{error}</p>}
			<p className="tubs-notice" role="status" hidden={!notice}>{notice}</p>
			<section className="tubs-table" aria-label="Flavor counts" aria-busy={rows === null}>
				<div className="tubs-row tubs-labels" aria-hidden="true"><span>Flavor</span><span>Back freezer</span><span>Front freezer</span><span>Back → front → case</span><span>Status</span></div>
				{rows === null && !error && <p className="tubs-empty">Loading…</p>}
				{rows !== null && shown.length === 0 && <p className="tubs-empty">Nothing here right now.</p>}
				{shown.map((r) => (
					<div className="tubs-row" key={r.id}>
						<span className="tubs-name"><strong>{r.name}</strong>{(twin(r) || r.category !== "Ice cream") && <span>{r.category}</span>}</span>
						<span className="tubs-cell tubs-back">
							<span className="tubs-count">
								<span className="tubs-where">Back freezer</span>
								{step(r, "back-", `Take one ${r.name} tub off the back count`, "−", r.back < 1)}
								<output aria-label={`${r.name}, back freezer`}>{r.back}</output>
								{step(r, "back+", `Made one ${r.name} tub, into the back freezer`, "+")}
								{step(r, "back+", `Made five ${r.name} tubs, into the back freezer`, "+5", false, 5)}
							</span>
							{r.back > 0 && <span className="tubs-ready">{[r.ready && `${r.ready} ready`, r.tomorrow && `${r.tomorrow} ready tomorrow`].filter(Boolean).join(" · ")}</span>}
						</span>
						<span className="tubs-cell tubs-front">
							<span className="tubs-count">
								<span className="tubs-where">Front freezer</span>
								{step(r, "front-", `Take one ${r.name} tub off the front count`, "−", r.front < 1)}
								<output aria-label={`${r.name}, front freezer`}>{r.front}</output>
								{step(r, "front+", `Add one ${r.name} tub to the front count`, "+")}
							</span>
						</span>
						<span className="tubs-acts">
							<button type="button" className="tubs-act" disabled={!!busy || r.ready < 1} title={r.ready < 1 && r.tomorrow > 0 ? "Went in today: ready tomorrow" : undefined} onClick={() => act(r, "move")}>Back to front</button>
							<button type="button" className="tubs-act primary" disabled={!!busy || r.front < 1} onClick={() => act(r, "case")}>Into the case</button>
							<button type="button" className="tubs-act" disabled={!!busy || r.front < 1} onClick={() => act(r, "last")}>Last one out of front</button>
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
