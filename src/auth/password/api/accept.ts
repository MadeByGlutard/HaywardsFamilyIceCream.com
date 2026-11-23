import type { APIRoute } from "astro";
import { apiError, apiSuccess, handleError } from "emdash/api/route-utils";
import { completeInvite, InviteError, validateInvite } from "@emdash-cms/auth";
import { passwordProblem } from "../hash";
import { allowAttempt, clientIp, database, readJson, setPassword, startSession, text, tooManyAttempts, users } from "../server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const db = database(context);
	if (!db) return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	try {
		if (!(await allowAttempt(db, `accept:${clientIp(context.request)}`, 20, 900))) return tooManyAttempts();
		const body = await readJson(context.request);
		const problem = passwordProblem(body.password);
		if (problem) return apiError("WEAK_PASSWORD", problem, 400);
		const adapter = users(db);
		const token = text(body.token);
		await validateInvite(adapter, token);
		const user = await completeInvite(adapter, token, { name: text(body.name) || undefined });
		await setPassword(db, user.id, body.password as string);
		await startSession(context, db, user.id);
		return apiSuccess({ success: true });
	} catch (error) {
		if (error instanceof InviteError)
			return apiError("INVALID_INVITE", "This invite link is invalid, used or expired. Ask for a new one.", 400);
		return handleError(error, "Could not accept the invite", "PASSWORD_ACCEPT_ERROR");
	}
};
