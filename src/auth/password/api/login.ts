import type { APIRoute } from "astro";
import { apiError, apiSuccess, handleError } from "emdash/api/route-utils";
import { MAX_LENGTH, verifyPassword } from "../hash";
import { allowAttempt, clientIp, database, readJson, startSession, storage, text, tooManyAttempts, users } from "../server";

export const prerender = false;

export const POST: APIRoute = async (context) => {
	const db = database(context);
	if (!db) return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	try {
		const body = await readJson(context.request);
		const email = text(body.email).toLowerCase();
		const password = typeof body.password === "string" ? body.password.slice(0, MAX_LENGTH + 1) : "";
		const byIp = await allowAttempt(db, `login-ip:${clientIp(context.request)}`, 30, 900);
		const byEmail = await allowAttempt(db, `login-email:${email}`, 10, 900);
		if (!byIp || !byEmail) return tooManyAttempts();

		const user = email ? await users(db).getUserByEmail(email) : null;
		const credential = user ? await storage(db).credentials.get(user.id) : null;
		const valid = await verifyPassword(password, credential?.hash);
		if (!valid || !user || (user as any).disabled)
			return apiError("INVALID_CREDENTIALS", "That email and password don't match.", 401);

		await startSession(context, db, user.id);
		return apiSuccess({ success: true });
	} catch (error) {
		return handleError(error, "Could not sign in", "PASSWORD_LOGIN_ERROR");
	}
};
