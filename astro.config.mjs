import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { password } from "./src/auth/password/index.mjs";

export default defineConfig({
	site: "https://haywardsfamilyicecream.com",
	output: "server",
	// remoteBindings: false keeps `astro dev` on local D1/R2/KV emulation in .wrangler/state.
	adapter: cloudflare({ inspectorPort: false, remoteBindings: false }),
	// Route caching on the Workers cache; EmDash purges by tag on publish.
	// A no-op in `astro dev`.
	cache: { provider: cacheCloudflare() },
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			authProviders: [password()],
			// Same public HTML for everyone, so staff share the cached page. The default
			// injects the toolbar on the server, and it comes and goes with the cache.
			toolbar: "client",
			admin: {
				siteName: "Hayward's",
				logo: "/brand/icons/icon-192.png",
				favicon: "/brand/icons/favicon-32.png",
				// Features this site doesn't use. Their pages stay reachable by URL.
				hiddenNavItems: ["calendar", "comments", "menus", "redirects", "widgets", "sections", "bylines", "import"],
			},
		}),
	],
	devToolbar: { enabled: false },
	vite: { server: { allowedHosts: ["terminal.local"], strictPort: true } },
});
