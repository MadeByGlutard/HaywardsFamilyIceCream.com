import type { APIRoute } from "astro";
import { apiError, apiSuccess, getPublicOrigin, handleError } from "emdash/api/route-utils";
import { generateToken, hashToken, Role } from "@emdash-cms/auth";
import { currentUser, database, newestResetKey, readJson, storage, text, users } from "../server";

export const prerender = false;

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Admin only: makes a one-time link the admin can pass to someone who forgot their password. */
export const POST: APIRoute = async (context) => {
	const db = database(context);
	const admin = currentUser(context);
	if (!db || !admin) return apiError("NOT_AUTHENTICATED", "Sign in first.", 401);
	if (admin.role < Role.ADMIN) return apiError("FORBIDDEN", "Only admins can reset passwords.", 403);
	try {
		const user = await users(db).getUserById(text((await readJson(context.request)).userId));
		if (!user) return apiError("NOT_FOUND", "No such user.", 404);
		// A new link replaces any older one, and dies if the password changes before it's used.
		const token = generateToken();
		const { credentials, resets } = storage(db);
		const issuedAt = Date.now();
		const credentialAt = (await credentials.get(user.id))?.updatedAt ?? null;
		await resets.put(hashToken(token), { userId: user.id, expiresAt: issuedAt + ONE_DAY, issuedAt, credentialAt });
		await resets.put(newestResetKey(user.id), { userId: user.id, expiresAt: issuedAt + ONE_DAY, issuedAt });
		const origin = getPublicOrigin(context.url, (context.locals as any).emdash?.config);
		return apiSuccess({ success: true, url: `${origin}/_emdash/password/reset?token=${encodeURIComponent(token)}` });
	} catch (error) {
		return handleError(error, "Could not make a reset link", "PASSWORD_RESET_LINK_ERROR");
	}
};
