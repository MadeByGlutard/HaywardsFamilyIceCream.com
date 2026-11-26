import * as React from "react";

type Stage = "freezing" | "back" | "front" | "cabinets";
interface Row extends Record<Stage, number> { id: string; name: string; category: string }
interface Change { at: string; text: string; by: string }
type Action = "add" | "remove" | "move" | "set";

const STAGES: Array<{ key: Stage; name: string }> = [
	{ key: "freezing", name: "Freezing" },
	{ key: "back", name: "Back freezer" },
	{ key: "front", name: "Front freezer" },
	{ key: "cabinets", name: "Cabinets" },
];
const MAX_COUNT = 999;
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
.tubs { max-width: 1100px; display: grid; gap: 16px; font-size: 14px; }
.tubs h1 { margin: 0; font-size: 28px; font-weight: 650; }
.tubs h2 { margin: 0 0 4px; font-size: 16px; }
.tubs-lead { margin: 4px 0 0; color: var(--text-color-kumo-subtle); max-width: 62ch; }
.tubs button, .tubs input { font: inherit; color: inherit; }
.tubs button { cursor: pointer; }
.tubs button:disabled { opacity: .25; cursor: not-allowed; }
.tubs-search { min-height: 44px; max-width: 22rem; width: 100%; box-sizing: border-box; padding: 0 12px; border: 1px solid var(--color-kumo-line); border-radius: 8px; background: var(--color-kumo-base); font-size: 16px; }
.tubs-sheet { overflow-x: auto; border: 1px solid var(--color-kumo-line); border-radius: 10px; background: var(--color-kumo-base); }
.tubs table { border-collapse: separate; border-spacing: 0; width: 100%; font-variant-numeric: tabular-nums; }
.tubs th, .tubs td { padding: 3px 4px; border-bottom: 1px solid var(--color-kumo-hairline, var(--color-kumo-line)); text-align: center; white-space: nowrap; }
.tubs thead th { padding: 8px 4px; font-size: 12px; font-weight: 650; color: var(--text-color-kumo-subtle); }
.tubs tbody tr:last-child td, .tubs tbody tr:last-child th { border-bottom: 0; }
.tubs tfoot td, .tubs tfoot th { border-top: 2px solid var(--color-kumo-line); border-bottom: 0; padding: 8px 4px; font-weight: 700; }
.tubs .tubs-name { position: sticky; left: 0; z-index: 1; background: var(--color-kumo-base); text-align: left; padding-left: 12px; min-width: 9rem; max-width: 12rem; white-space: normal; font-weight: 600; box-shadow: 1px 0 0 var(--color-kumo-line); }
.tubs-name small { display: block; font-weight: 400; color: var(--text-color-kumo-subtle); }
.tubs-cell { display: inline-flex; align-items: center; gap: 2px; }
.tubs-step, .tubs-move { width: 44px; height: 44px; border: 0; border-radius: 8px; background: transparent; font-size: 20px; line-height: 1; }
.tubs-step:not(:disabled):hover, .tubs-move:not(:disabled):hover { background: var(--color-kumo-line); }
.tubs-move { width: 36px; font-size: 18px; color: var(--text-color-kumo-subtle); }
.tubs-num { width: 3.2em; height: 40px; box-sizing: border-box; border: 1px solid var(--color-kumo-line); border-radius: 6px; background: transparent; text-align: center; font-size: 17px; font-weight: 700; -moz-appearance: textfield; }
.tubs-num::-webkit-inner-spin-button, .tubs-num::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.tubs-zero .tubs-num { color: var(--text-color-kumo-subtle); font-weight: 400; opacity: .55; }
.tubs-changes { display: grid; gap: 6px; }
.tubs-changes p { margin: 0; color: var(--text-color-kumo-subtle); }
.tubs-empty { padding: 16px; margin: 0; }
@media (max-width: 600px) { .tubs .tubs-name { min-width: 6.5rem; max-width: 7.5rem; padding-left: 8px; font-size: 13px; } }
.tubs-error { margin: 0; color: var(--text-color-kumo-danger); font-weight: 600; }
`;

export function TubCounts() {
	const [rows, setRows] = React.useState<Row[] | null>(null);
	const [changes, setChanges] = React.useState<Change[]>([]);
	const [error, setError] = React.useState("");
	const [search, setSearch] = React.useState("");
	// Taps are sent one after another, so quick taps are never lost or shown out of order.
	const queue = React.useRef<Promise<unknown>>(Promise.resolve());

	const load = async (response: Response) => {
		const body = (await response.json()) as { data?: { rows: Row[]; changes: Change[] }; error?: { message?: string } };
		if (!response.ok || !body.data) throw new Error(body.error?.message || "Couldn’t load the counts.");
		setRows(body.data.rows);
		setChanges(body.data.changes);
		setError("");
	};
	React.useEffect(() => {
		fetch(URL, { headers }).then(load).catch((e) => setError(e.message));
	}, []);
	const send = (row: Row, action: Action, stage: Stage, value?: number) => {
		queue.current = queue.current
			.then(() => fetch(URL, { method: "POST", headers, body: JSON.stringify({ flavor: row.id, action, stage, value }) }))
			.then(load)
			.catch((e) => setError(e.message));
	};
	const typed = (row: Row, stage: Stage, input: HTMLInputElement) => {
		const value = Math.trunc(Number(input.value));
		if (input.value.trim() === "" || !(value >= 0 && value <= MAX_COUNT)) {
			input.value = String(row[stage]);
			return;
		}
		if (value !== row[stage]) send(row, "set", stage, value);
	};

	const all = rows ?? [];
	const twin = (r: Row) => all.filter((o) => o.name === r.name).length > 1;
	const query = search.trim().toLowerCase();
	const shown = all.filter((r) => !query || `${r.name} ${r.category}`.toLowerCase().includes(query));
	const total = (stage: Stage) => shown.reduce((sum, r) => sum + r[stage], 0);

	return (
		<div className="tubs">
			<style>{css}</style>
			<div>
				<h1>Tub counts</h1>
				<p className="tubs-lead">Staff only, in tubs. This never changes the website. Tap a number to type it, use − / +, or → to move one tub to the next spot.</p>
			</div>
			<input className="tubs-search" type="search" placeholder="Find a flavor" aria-label="Find a flavor" value={search} onChange={(e) => setSearch(e.target.value)} />
			{error && <p className="tubs-error" role="alert">{error}</p>}
			<div className="tubs-sheet" aria-busy={rows === null}>
				<table>
					<thead>
						<tr>
							<th className="tubs-name" scope="col">Flavor</th>
							{STAGES.map((s, i) => (
								<React.Fragment key={s.key}>
									{i > 0 && <th aria-hidden="true" />}
									<th scope="col">{s.name}</th>
								</React.Fragment>
							))}
						</tr>
					</thead>
					<tbody>
						{shown.map((r) => (
							<tr key={r.id}>
								<th className="tubs-name" scope="row">
									{r.name}
									{(twin(r) || r.category !== "Ice cream") && <small>{r.category}</small>}
								</th>
								{STAGES.map((s, i) => (
									<React.Fragment key={s.key}>
										{i > 0 && (
											<td>
												<button type="button" className="tubs-move" aria-label={`Move 1 ${r.name} from ${STAGES[i - 1].name} to ${s.name}`} disabled={r[STAGES[i - 1].key] < 1} onClick={() => send(r, "move", STAGES[i - 1].key)}>→</button>
											</td>
										)}
										<td className={r[s.key] === 0 ? "tubs-zero" : undefined}>
											<span className="tubs-cell">
												<button type="button" className="tubs-step" aria-label={`Remove 1 ${r.name} from ${s.name}`} disabled={r[s.key] < 1} onClick={() => send(r, "remove", s.key)}>−</button>
												<input
													key={r[s.key]}
													className="tubs-num"
													type="number"
													inputMode="numeric"
													min={0}
													max={MAX_COUNT}
													defaultValue={r[s.key]}
													aria-label={`${r.name}, ${s.name}`}
													onFocus={(e) => e.currentTarget.select()}
													onBlur={(e) => typed(r, s.key, e.currentTarget)}
													onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
												/>
												<button type="button" className="tubs-step" aria-label={`Add 1 ${r.name} to ${s.name}`} onClick={() => send(r, "add", s.key)}>+</button>
											</span>
										</td>
									</React.Fragment>
								))}
							</tr>
						))}
					</tbody>
					{shown.length > 0 && (
						<tfoot>
							<tr>
								<th className="tubs-name" scope="row">Total</th>
								{STAGES.map((s, i) => (
									<React.Fragment key={s.key}>
										{i > 0 && <td />}
										<td>{total(s.key)}</td>
									</React.Fragment>
								))}
							</tr>
						</tfoot>
					)}
				</table>
				{rows === null && !error && <p className="tubs-empty">Loading…</p>}
				{rows !== null && shown.length === 0 && <p className="tubs-empty">No flavor matches “{search}”.</p>}
			</div>
			<section className="tubs-changes" aria-label="Recent changes" aria-live="polite">
				<h2>Recent changes</h2>
				{changes.length === 0 ? <p>No changes yet.</p> : changes.map((c) => <p key={c.at + c.text}>{when(c.at)} · {c.text}{c.by && ` · ${c.by}`}</p>)}
			</section>
		</div>
	);
}
