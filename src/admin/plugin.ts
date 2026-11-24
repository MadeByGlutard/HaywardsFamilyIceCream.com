import { definePlugin } from "emdash";
import { categoryLinks } from "../lib/catalog-links";

export const createPlugin = () =>
	definePlugin({
		id: "haywards-admin",
		displayName: "Hayward's admin",
		description: "Made for this site (src/admin): the Category column and the Square panel.",
		version: "1.0.0",
		// Written by code only. No route or form changes it.
		storage: { square: { indexes: [] } },
		routes: {
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
