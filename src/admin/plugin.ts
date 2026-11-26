import { definePlugin } from "emdash";
import { categoryLinks } from "../lib/catalog-links";
import { ACTIONS, type TubAction } from "./tub-flow";
import { changeTubs, readTubs } from "./tubs";

export const createPlugin = () =>
	definePlugin({
		id: "haywards-admin",
		displayName: "Hayward's admin",
		description: "Made for this site (src/admin): tub counts, the Category column and the Square panel.",
		version: "1.0.0",
		// Written by code only. No route or form changes it.
		storage: { square: { indexes: [] }, tubs: { indexes: ["front", "back"] }, tubLog: { indexes: ["at"] } },
		admin: { pages: [{ path: "/tubs", label: "Tub counts", icon: "snowflake" }] },
		routes: {
			// Tub counts: staff only (contributors and up), never shown on the site.
			tubs: {
				permission: "content:create",
				handler: async (ctx) => {
					const storage = ctx.storage as any;
					if (ctx.request.method === "POST") {
						const { flavor, action, count } = (ctx.input ?? {}) as { flavor?: string; action?: TubAction; count?: number };
						const { rows } = await readTubs(storage);
						const row = rows.find((r) => r.id === flavor);
						if (!row || !action || !ACTIONS.includes(action)) throw new Error("Unknown flavor or action");
						const name = row.category && rows.filter((r) => r.name === row.name).length > 1 ? `${row.name} (${row.category})` : row.name;
						const notice = await changeTubs(storage, { id: row.id, name }, action, ctx.user?.name || ctx.user?.email || "", Number(count ?? 1));
						return { ...(await readTubs(storage)), notice };
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
