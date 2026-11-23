import type { APIRoute } from "astro";
import { apiError, apiSuccess, handleError } from "emdash/api/route-utils";
import { hashToken } from "@emdash-cms/auth";
import { passwordProblem } from "../hash";
import { allowAttempt, clientIp, database, readJson, setPassword, startSession, storage, text, tooManyAttempts, users } from "../server";

export const prerender = false;

const invalid = () => apiError("INVALID_LINK", "This reset link is invalid, used or expired. Ask for a new one.", 400);

export const POST: APIRoute = async (context) => {
	const db = database(context);
	if (!db) return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	try {
		if (!(await allowAttempt(db, `reset:${clientIp(context.request)}`, 20, 900))) return tooManyAttempts();
		const body = await readJson(context.request);
		const problem = passwordProblem(body.password);
		if (problem) return apiError("WEAK_PASSWORD", problem, 400);
		const token = text(body.token);
		if (!/^[\w-]{20,}$/.test(token)) return invalid();
		const { resets } = storage(db);
		const id = hashToken(token);
		const reset = await resets.get(id);
		// Deleting first makes the link single-use even if two requests race.
		if (!reset || !(await resets.delete(id)) || reset.expiresAt < Date.now()) return invalid();
		const user = await users(db).getUserById(reset.userId);
		if (!user || (user as any).disabled) return invalid();
		await setPassword(db, user.id, body.password as string);
		await startSession(context, db, user.id);
		return apiSuccess({ success: true });
	} catch (error) {
		return handleError(error, "Could not reset the password", "PASSWORD_RESET_ERROR");
	}
};
