import { defineMiddleware } from "astro:middleware";
import { withSharedAdmin } from "./admin/shared";
import { signedInUnderCurrentPassword } from "./auth/password/server";
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

/** A short holding page while the content upgrade can't finish; never cached. */
function updating() {
	return new Response(
		`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Back in a minute · Hayward’s Family Ice Cream</title><body style="font:18px/1.5 system-ui,sans-serif;max-width:32rem;margin:15vh auto;padding:0 20px;color:#28241f;background:#fffdf8"><h1 style="font-size:1.6rem">We’re updating the website</h1><p>It’ll be back in a minute. Hayward’s Family Ice Cream, 383 Elm Street, Milford, New Hampshire.</p></body></html>`,
		{ status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "60" } },
	);
}

export const onRequest = defineMiddleware(async (context, next) => {
	const { url, request, redirect, isPrerendered } = context;
	const to = request.method === "GET" ? destination(url.pathname) : undefined;
	if (to) return redirect(to + url.search);
	if (!isPrerendered) {
		try {
			await ensureContentModel();
		} catch {
			// Don't serve pages from a half-upgraded database; staff routes stay reachable.
			if (!url.pathname.startsWith("/_emdash/")) return updating();
		}
	}
	// A password change or reset signs out every other session that used the old password.
	if (!__ACCESS_SIGN_IN__ && (context.locals as any).user && !(await signedInUnderCurrentPassword(context))) {
		await (context.session as any)?.destroy?.();
		if (url.pathname.startsWith("/_emdash/api/")) {
			return new Response(JSON.stringify({ error: { code: "NOT_AUTHENTICATED", message: "Your password was changed. Sign in again." } }), {
				status: 401,
				headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
			});
		}
		return redirect(`/login?redirect=${encodeURIComponent(url.pathname + url.search)}`);
	}
	const response = await next();
	// Previews on the custom domain don't get workers.dev's automatic no-index header.
	if (__ACCESS_SIGN_IN__) response.headers.set("X-Robots-Tag", "noindex");
	return request.method === "GET" ? withSharedAdmin(context, response) : response;
});
