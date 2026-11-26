// Tub counts for the freezers, a Category column in the flavor and menu item lists, and Square
// IDs shown read-only.

/** @returns {import("emdash").PluginDescriptor} */
export function haywardsAdmin() {
	return {
		id: "haywards-admin",
		displayName: "Hayward's admin",
		description: "Made for this site (src/admin): tub counts, the Category column and the Square panel.",
		version: "1.0.0",
		format: "native",
		entrypoint: "/src/admin/plugin.ts",
		adminEntry: "/src/admin/admin.tsx",
		adminPages: [{ path: "/tubs", label: "Tub counts", icon: "snowflake" }],
	};
}
