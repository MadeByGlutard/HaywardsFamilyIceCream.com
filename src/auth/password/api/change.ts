import type { APIRoute } from "astro";
import { apiError, apiSuccess, handleError } from "emdash/api/route-utils";
import { passwordProblem, verifyPassword } from "../hash";
import { allowAttempt, currentUser, database, readJson, setPassword, startSession, storage, tooManyAttempts } from "../server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const db = database(context);
	const user = currentUser(context);
	if (!db || !user) return apiError("NOT_AUTHENTICATED", "Sign in first.", 401);
	try {
		if (!(await allowAttempt(db, `change:${user.id}`, 10, 900))) return tooManyAttempts();
		const body = await readJson(context.request);
		const problem = passwordProblem(body.password);
		if (problem) return apiError("WEAK_PASSWORD", problem, 400);
		const credential = await storage(db).credentials.get(user.id);
		const current = typeof body.current === "string" ? body.current : "";
		if (credential && !(await verifyPassword(current, credential.hash)))
			return apiError("INVALID_CREDENTIALS", "Your current password is wrong.", 400);
		await setPassword(db, user.id, body.password as string);
		await startSession(context, db, user.id);
		return apiSuccess({ success: true });
	} catch (error) {
		return handleError(error, "Could not change the password", "PASSWORD_CHANGE_ERROR");
	}
};
