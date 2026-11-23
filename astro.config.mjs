import cloudflare from "@astrojs/cloudflare";
import { cacheCloudflare } from "@astrojs/cloudflare/cache";
import react from "@astrojs/react";
import { access, d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import { password } from "./src/auth/password/index.mjs";

// Preview builds only (scripts/preview.mjs sets PREVIEW_D1_NAME): whoever Cloudflare Access
// let in is signed in to the admin, with no second login. EmDash checks Access's signed token.
// Production has no Access in front of it and keeps email and password.
const isPreview = !!process.env.PREVIEW_D1_NAME;
const accessSignIn = {
	auth: access({
		teamDomain: "misty-night-ed60.cloudflareaccess.com",
		// The Access application's audience tag: an identifier, not a secret.
		audience: "7678baa0377ee0d5e4217e11a9c8dd2f24fdc3c801225f78df09028f85b38207",
		// Admin. Accounts that already exist keep their role and name.
		defaultRole: 50,
		syncName: false,
	}),
};

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
			...(isPreview ? accessSignIn : {}),
			// Same public HTML for everyone, so staff share the cached page. The default
			// injects the toolbar on the server, and it comes and goes with the cache.
			toolbar: "client",
			admin: {
				siteName: "Hayward's",
				logo: "/icons/icon-192x192.png",
				favicon: "/favicon-32x32.png",
				// Features this site doesn't use. Their pages stay reachable by URL.
				hiddenNavItems: ["calendar", "comments", "menus", "redirects", "widgets", "sections", "bylines", "import"],
			},
		}),
	],
	devToolbar: { enabled: false },
	vite: { define: { __ACCESS_SIGN_IN__: JSON.stringify(isPreview) }, server: { allowedHosts: ["terminal.local"], strictPort: true } },
});
