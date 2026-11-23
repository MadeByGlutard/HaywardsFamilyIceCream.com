import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

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
		}),
	],
	devToolbar: { enabled: false },
	vite: { server: { allowedHosts: ["terminal.local"], strictPort: true } },
});
