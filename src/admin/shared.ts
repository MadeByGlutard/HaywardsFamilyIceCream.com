import type { APIContext } from "astro";
import { waitUntil } from "cloudflare:workers";
import { POST as indexMedia } from "emdash/internal/routes/api/admin/media-usage/progress";

/**
 * What Settings, Sidebars starts out hiding. EmDash keeps that choice per person and has no
 * setting for everyone; this is what anyone who hasn't changed theirs gets.
 */
const SIDEBARS = {
	version: 1,
	nav: { order: [], hidden: ["/byline-schema"] },
	// Bylines stay: blog posts credit their author.
	editor: { order: [], hidden: ["url-language", "ownership"] },
};

const INDEXING_MS = 20_000;

/**
 * EmDash indexes where media is used only while its Media screen is open. Opening any admin
 * page moves it along for a while instead. With nothing to index this is one quick step.
 */
async function continueIndexing(context: APIContext) {
	const until = Date.now() + INDEXING_MS;
	let more = true;
	while (more && Date.now() < until) {
		const response = await indexMedia(context);
		const body = (await response.json()) as { data?: { nextRequestInMs?: number | null } };
		more = response.ok && body.data?.nextRequestInMs === 0;
	}
}

/** Shared admin settings: default sidebars in EmDash's answer to "who am I". */
export async function withSharedAdmin(context: APIContext, response: Response): Promise<Response> {
	const path = context.url.pathname;
	if (path === "/_emdash/api/auth/me" && response.ok) {
		waitUntil(continueIndexing(context).catch((error) => console.error("[media-usage] indexing failed:", error)));
		const body = (await response.json()) as { data?: { adminLayout?: unknown } };
		if (body.data && !body.data.adminLayout) body.data.adminLayout = SIDEBARS;
		return new Response(JSON.stringify(body), response);
	}
	return response;
}
