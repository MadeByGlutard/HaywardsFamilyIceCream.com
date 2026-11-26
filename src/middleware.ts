import { defineMiddleware } from "astro:middleware";
import { withSharedAdmin } from "./admin/shared";
import { ensureContentModel } from "./lib/upgrade";

// Staff sign in with a password, so EmDash's passkey-first screens hand over to ours.
// Previews are already signed in by Cloudflare Access, so the sign-in page leads to the admin.
const PASSWORD_PAGES: Record<string, string> = __ACCESS_SIGN_IN__
	? { "/login": "/_emdash/admin", "/_emdash/admin/login": "/_emdash/admin" }
	: {
			"/_emdash/admin/login": "/login",
			"/_emdash/password/login": "/login",
			"/_emdash/admin/invite/accept": "/_emdash/password/accept",
		};

/** Where a short or built-in address leads, or undefined to serve the request as it is. */
export function destination(pathname: string): string | undefined {
	const path = pathname.replace(/\/+$/, "");
	// EmDash's admin lives at /_emdash/admin and can't be moved; /admin is the one to remember.
	const admin = path.match(/^\/admin(\/.*)?$/);
	return admin ? `/_emdash/admin${admin[1] ?? ""}` : PASSWORD_PAGES[path];
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, request, redirect, isPrerendered } = context;
	const to = request.method === "GET" ? destination(url.pathname) : undefined;
	if (to) return redirect(to + url.search);
	if (!isPrerendered) await ensureContentModel();
	const response = await next();
	// Previews on the custom domain don't get workers.dev's automatic no-index header.
	if (__ACCESS_SIGN_IN__) response.headers.set("X-Robots-Tag", "noindex");
	return request.method === "GET" ? withSharedAdmin(context, response) : response;
});
