import type { APIContext } from "astro";
import { createKyselyAdapter } from "@emdash-cms/auth/adapters/kysely";
import { apiError, getAuthProviderStorage } from "emdash/api/route-utils";
import { sql } from "kysely";
import { hashPassword } from "./hash";

interface Credential {
	hash: string;
	updatedAt: string;
}
interface Reset {
	userId: string;
	expiresAt: number;
}

export function database(context: Pick<APIContext, "locals">) {
	return (context.locals as any).emdash?.db;
}

export function currentUser(context: Pick<APIContext, "locals">) {
	return (context.locals as any).user as { id: string; email: string; role: number } | undefined;
}

export const users = (db: any) => createKyselyAdapter(db);

export function storage(db: any) {
	const collections = getAuthProviderStorage(db, "password", {
		credentials: { indexes: [] },
		resets: { indexes: [] },
	}) as any;
	return collections as {
		credentials: {
			get(id: string): Promise<Credential | null>;
			put(id: string, data: Credential): Promise<void>;
		};
		resets: {
			get(id: string): Promise<Reset | null>;
			put(id: string, data: Reset): Promise<void>;
			delete(id: string): Promise<boolean>;
		};
	};
}

export async function setPassword(db: any, userId: string, password: string) {
	await storage(db).credentials.put(userId, {
		hash: await hashPassword(password),
		updatedAt: new Date().toISOString(),
	});
}

/** Starts a session under a fresh session ID, so one planted before sign-in is useless. */
export async function startSession(context: APIContext, db: any, userId: string) {
	await db.updateTable("users").set({ last_login_at: new Date().toISOString() }).where("id", "=", userId).execute();
	const session = context.session as any;
	await session.regenerate();
	session.set("user", { id: userId });
}

/** Counts an attempt in EmDash's rate-limit table. Returns false once over the limit. */
export async function allowAttempt(db: any, subject: string, max: number, windowSeconds: number) {
	const size = windowSeconds * 1000;
	const start = new Date(Math.floor(Date.now() / size) * size).toISOString();
	const { rows } = await sql<{ count: number }>`
		INSERT INTO _emdash_rate_limits (key, "window", count)
		VALUES (${`password:${subject}`}, ${start}, 1)
		ON CONFLICT (key, "window") DO UPDATE SET count = _emdash_rate_limits.count + 1
		RETURNING count
	`.execute(db);
	return (rows[0]?.count ?? 1) <= max;
}

export const clientIp = (request: Request) =>
	((request as any).cf && request.headers.get("cf-connecting-ip")) || "unknown";

export function tooManyAttempts() {
	const response = apiError("RATE_LIMITED", "Too many attempts. Wait 15 minutes and try again.", 429);
	response.headers.set("Retry-After", "900");
	return response;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
	const body = await request.json().catch(() => null);
	return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Only follow redirects back into the admin. */
export function adminRedirect(value: unknown) {
	const path = text(value);
	return /^\/_emdash\/admin(?:[/?#]|$)/.test(path) && !path.includes("\\") ? path : "/_emdash/admin";
}
