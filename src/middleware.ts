import { defineMiddleware } from "astro:middleware";

// Staff sign in with a password, so EmDash's passkey-first screens hand over to ours.
const PASSWORD_PAGES: Record<string, string> = {
	"/_emdash/admin/login": "/_emdash/password/login",
	"/_emdash/admin/invite/accept": "/_emdash/password/accept",
};

export const onRequest = defineMiddleware(({ url, request, redirect }, next) => {
	const page = request.method === "GET" && PASSWORD_PAGES[url.pathname.replace(/\/$/, "")];
	return page ? redirect(page + url.search) : next();
});
