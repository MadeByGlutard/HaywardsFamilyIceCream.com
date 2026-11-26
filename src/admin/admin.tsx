import type { ContentEditorPanelExtension, ContentListColumnExtension } from "@emdash-cms/admin";
import * as React from "react";
import { TubCounts } from "./tub-counts";

const read = async (path: string) => ((await (await fetch(path, { headers: { "X-EmDash-Request": "1" } })).json()) as { data: any }).data;

/** Category names by entry, read once for the rows on screen. */
async function readNames(): Promise<Map<string, string>> {
	const [{ links }, { items }] = await Promise.all([
		read("/_emdash/api/plugins/haywards-admin/categories"),
		read("/_emdash/api/content/catalog_categories?limit=100"),
	]);
	const names = new Map<string, string>(items.map((item: any) => [item.id, item.data.name]));
	return new Map(links.map((link: any) => [link.entry, names.get(link.category) ?? ""]));
}

let pending: { at: number; names: Promise<Map<string, string>> } | undefined;
const categoryNames = () => {
	if (!pending || Date.now() - pending.at > 3000) pending = { at: Date.now(), names: readNames() };
	return pending.names;
};

function CategoryCell({ item }: { item: { id: string } }) {
	const [name, setName] = React.useState("");
	React.useEffect(() => {
		let shown = true;
		categoryNames().then((names) => shown && setName(names.get(item.id) ?? ""), () => {});
		return () => void (shown = false);
	}, [item]);
	return <>{name}</>;
}

// EmDash's own list columns can't show a reference.
export const contentListColumns: ContentListColumnExtension[] = [
	{ id: "category", label: "Category", collections: ["catalog_flavors", "catalog_items"], cell: CategoryCell as ContentListColumnExtension["cell"] },
];

function SquarePanel({ entry }: { entry: { id: string } }) {
	const [squareId, setSquareId] = React.useState<string | null | undefined>();
	React.useEffect(() => {
		let shown = true;
		read(`/_emdash/api/plugins/haywards-admin/square?entry=${encodeURIComponent(entry.id)}`).then(
			(link) => shown && setSquareId(link.squareId),
			() => {},
		);
		return () => void (shown = false);
	}, [entry.id]);
	if (squareId === undefined) return null;
	return squareId ? <code style={{ fontSize: 12, wordBreak: "break-all" }}>{squareId}</code> : <p style={{ fontSize: 14, opacity: 0.7 }}>Not linked</p>;
}

// Set by code, so it's shown and never edited.
export const contentEditorPanels: ContentEditorPanelExtension[] = [
	{ id: "square", title: "Square ID", collections: ["catalog_flavors", "catalog_items", "catalog_categories"], component: SquarePanel as ContentEditorPanelExtension["component"] },
];

// Sidebar pages (declared in index.mjs and plugin.ts).
export const pages = { "/tubs": TubCounts };
