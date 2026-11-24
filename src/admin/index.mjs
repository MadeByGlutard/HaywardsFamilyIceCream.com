// Adds a Category column to the flavor and menu item lists, and shows Square IDs, read-only.

/** @returns {import("emdash").PluginDescriptor} */
export function haywardsAdmin() {
	return {
		id: "haywards-admin",
		displayName: "Hayward's admin",
		description: "Made for this site (src/admin): the Category column and the Square panel.",
		version: "1.0.0",
		format: "native",
		entrypoint: "/src/admin/plugin.ts",
		adminEntry: "/src/admin/admin.tsx",
	};
}
