import { definePlugin } from "emdash";
import { categoryLinks } from "../lib/catalog-links";
import { changeText, parseChange } from "./tub-flow";
import { changeTubs, readTubs } from "./tubs";

export const createPlugin = () =>
	definePlugin({
		id: "haywards-admin",
		displayName: "Hayward's admin",
		description: "Made for this site (src/admin): tub counts, the Category column and the Square panel.",
		version: "1.0.0",
		// Written by code only. No route or form changes it.
		storage: { square: { indexes: [] }, tubs: { indexes: ["hard", "back", "front", "cab"] }, tubLog: { indexes: ["at"] } },
		admin: { pages: [{ path: "/tubs", label: "Tub counts", icon: "snowflake" }] },
		routes: {
			// Tub counts: staff only (contributors and up), never shown on the site.
			tubs: {
				permission: "content:create",
				handler: async (ctx) => {
					const storage = ctx.storage as any;
					if (ctx.request.method === "POST") {
						// { flavor, change } makes a change; { flavor, undo } takes back one the page was told about.
						const input = (ctx.input ?? {}) as { flavor?: string; change?: unknown; undo?: unknown };
						const change = parseChange(input.undo ?? input.change);
						const { rows } = await readTubs(storage);
						const row = rows.find((r) => r.id === input.flavor);
						if (!row || !change) throw new Error("Unknown flavor or change");
						const name = row.category && rows.filter((r) => r.name === row.name).length > 1 ? `${row.name} (${row.category})` : row.name;
						const isUndo = input.undo !== undefined;
						const done = await changeTubs(storage, { id: row.id, name }, change, ctx.user?.name || ctx.user?.email || "", isUndo);
						const result = done
							? { done: isUndo ? null : { text: changeText(done, name), change: done } }
							: { failed: isUndo ? "Couldn’t undo: those tubs have moved on since." : "Nothing to move: someone may have just done it." };
						return { ...(await readTubs(storage)), ...result };
					}
					return readTubs(storage);
				},
			},
			square: {
				permission: "content:read",
				handler: async (ctx) => {
					const entry = new URL(ctx.request.url).searchParams.get("entry") ?? "";
					const link = (await ctx.storage.square.get(entry)) as { squareId: string } | null;
					return { squareId: link?.squareId ?? null };
				},
			},
			// For the Category column: which category each flavor and menu item is in.
			categories: { permission: "content:read", handler: async () => ({ links: await categoryLinks() }) },
		},
	});
export default createPlugin;
