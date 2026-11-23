import type { APIRoute } from "astro";
import { apiError, apiSuccess, finalizeSetup, handleError, OptionsRepository } from "emdash/api/route-utils";
import { generateToken, Role, secureCompare } from "@emdash-cms/auth";
import { sql } from "kysely";
import { passwordProblem } from "../hash";
import { allowAttempt, clientIp, database, readJson, setPassword, startSession, tooManyAttempts } from "../server";

export const prerender = false;

const SETUP_COOKIE = "emdash_setup_nonce";

/** Creates the first admin. Only works during setup, while there are no users. */
export const POST: APIRoute = async (context) => {
	const db = database(context);
	if (!db) return apiError("NOT_CONFIGURED", "EmDash is not initialized", 500);
	try {
		const options = new OptionsRepository(db);
		const complete = await options.get("emdash:setup_complete");
		if (complete === true || complete === "true") return apiError("SETUP_COMPLETE", "Setup is already complete.", 400);
		// Written by the wizard's account step, along with a cookie for the browser running setup.
		const state = (await options.get("emdash:setup_state")) as { step?: string; email?: string; name?: string; nonce?: string } | null;
		const nonce = context.cookies.get(SETUP_COOKIE)?.value;
		if (state?.step !== "admin" || !state.email || !state.nonce || !nonce || !secureCompare(nonce, state.nonce))
			return apiError("INVALID_STATE", "Setup expired or was opened in another browser. Start again from the first step.", 400);
		if (!(await allowAttempt(db, `setup:${clientIp(context.request)}`, 10, 900))) return tooManyAttempts();

		const body = await readJson(context.request);
		const problem = passwordProblem(body.password);
		if (problem) return apiError("WEAK_PASSWORD", problem, 400);

		const id = generateToken();
		const now = new Date().toISOString();
		// One statement, so two simultaneous requests can't both become the first admin.
		const { rows } = await sql`
			INSERT INTO users (id, email, name, role, email_verified, created_at, updated_at)
			SELECT ${id}, ${state.email.toLowerCase()}, ${state.name || null}, CAST(${Role.ADMIN} AS integer), 0, ${now}, ${now}
			WHERE NOT EXISTS (SELECT 1 FROM users)
			RETURNING id
		`.execute(db);
		if (!rows.length) return apiError("ADMIN_EXISTS", "An admin already exists.", 400);

		context.cookies.delete(SETUP_COOKIE, { path: "/_emdash/" });
		await setPassword(db, id, body.password as string);
		await finalizeSetup(db);
		await startSession(context, db, id);
		return apiSuccess({ success: true });
	} catch (error) {
		return handleError(error, "Could not create the admin", "PASSWORD_SETUP_ERROR");
	}
};
