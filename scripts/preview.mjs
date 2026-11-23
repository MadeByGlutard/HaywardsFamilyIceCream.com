#!/usr/bin/env node
// Per-branch previews with their own D1 database and R2 bucket, seeded from production.
//
//   node scripts/preview.mjs deploy [--branch <name>] [--reseed]
//   node scripts/preview.mjs delete [--branch <name>]
//
// deploy: creates `haywardsfamilyicecream-com-<branch>` in D1 and R2 if missing,
//         copies production into them the first time (or with --reseed), then runs
//         `cf previews deploy` with those resources bound (see cloudflare.config.ts).
// delete: deletes the Worker Preview, its D1 database and its R2 bucket.
//
// Auth: CLOUDFLARE_API_TOKEN, with D1 Edit and Workers R2 Storage Edit as well as the
// Workers permissions. Account: CLOUDFLARE_ACCOUNT_ID, otherwise the only account the
// token can see.

import { spawnSync } from "node:child_process";

const PREFIX = "haywardsfamilyicecream-com";
const PRODUCTION_D1_ID = "406e55ec-a241-4bad-a648-15dc41f01810";
const PRODUCTION_R2 = "haywardsfamilyicecream-com";
const LOCATION = "enam";
const API = "https://api.cloudflare.com/client/v4";

// ---------------------------------------------------------------- arguments

const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
	const i = args.indexOf(`--${name}`);
	return i === -1 ? undefined : args[i + 1];
};
if (!["deploy", "delete"].includes(command)) {
	console.error("Usage: node scripts/preview.mjs <deploy|delete> [--branch <name>] [--reseed]");
	process.exit(2);
}

function currentBranch() {
	const fromCi =
		process.env.WORKERS_CI_BRANCH || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME;
	if (fromCi) return fromCi;
	const git = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" });
	const branch = git.stdout.trim();
	if (!branch || branch === "HEAD") throw new Error("No branch found; pass --branch <name>.");
	return branch;
}

const branch = option("branch") ?? currentBranch();
if (branch === "main") throw new Error("main is production; previews are for other branches.");
// D1 and R2 names: lowercase letters, digits and dashes; R2 allows at most 63 characters.
const slug = branch
	.toLowerCase()
	.replace(/[^a-z0-9]+/g, "-")
	.replace(/^-+|-+$/g, "")
	.slice(0, 63 - PREFIX.length - 1)
	.replace(/-+$/g, "");
if (!slug) throw new Error(`Cannot make a resource name from branch "${branch}".`);
const name = `${PREFIX}-${slug}`;

// ---------------------------------------------------------------- Cloudflare API

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error("Set CLOUDFLARE_API_TOKEN.");

async function api(path, { method = "GET", body, raw = false, allow404 = false } = {}) {
	const response = await fetch(`${API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			...(body !== undefined && !(body instanceof Uint8Array) ? { "Content-Type": "application/json" } : {}),
		},
		body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body),
	});
	if (allow404 && response.status === 404) return undefined;
	if (raw) {
		if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${await response.text()}`);
		return response;
	}
	const json = await response.json().catch(() => ({}));
	if (!response.ok || json.success === false) {
		throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(json.errors ?? json)}`);
	}
	return json;
}

async function accountId() {
	if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
	const { result } = await api("/accounts");
	if (result.length !== 1) throw new Error("Set CLOUDFLARE_ACCOUNT_ID; the token sees more than one account.");
	return result[0].id;
}

const account = await accountId();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (message) => console.log(`[preview] ${message}`);

// ---------------------------------------------------------------- D1

async function findDatabase() {
	const { result } = await api(`/accounts/${account}/d1/database?name=${encodeURIComponent(name)}`);
	return result.find((db) => db.name === name);
}

async function createDatabase() {
	const { result } = await api(`/accounts/${account}/d1/database`, {
		method: "POST",
		body: { name, primary_location_hint: LOCATION },
	});
	return result;
}

// D1's export API refuses databases with virtual tables, and EmDash keeps its
// search index in FTS5 tables. So production is copied statement by statement:
// tables in creation order, then rows, indexes, FTS tables (refilled from their
// own rows) and finally triggers and views, so copied rows don't fire triggers.

const query = (databaseId, body) =>
	api(`/accounts/${account}/d1/database/${databaseId}/query`, { method: "POST", body });

async function rows(databaseId, sql, params = []) {
	const { result } = await query(databaseId, { sql, params });
	return result[0].results;
}

const FTS_SHADOW_SUFFIXES = ["_config", "_content", "_data", "_docsize", "_idx"];
const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

async function copyProduction(targetId) {
	const schema = await rows(
		PRODUCTION_D1_ID,
		"SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY rowid",
	);
	const isVirtual = (entry) => /^CREATE VIRTUAL TABLE/i.test(entry.sql);
	const virtualNames = schema.filter((entry) => entry.type === "table" && isVirtual(entry)).map((entry) => entry.name);
	const isShadow = (entry) =>
		virtualNames.some((v) => FTS_SHADOW_SUFFIXES.some((suffix) => entry.name === `${v}${suffix}`));
	const tables = schema.filter((entry) => entry.type === "table" && !isVirtual(entry) && !isShadow(entry));
	const virtualTables = schema.filter((entry) => entry.type === "table" && isVirtual(entry));
	const ofType = (type) => schema.filter((entry) => entry.type === type);

	const run = (statements) =>
		statements.length ? query(targetId, { sql: statements.map((entry) => entry.sql).join(";\n") }) : undefined;

	await run(tables);
	let copied = 0;
	for (const table of [...tables, ...virtualTables]) {
		if (isVirtual(table)) await run([table]);
		const columns = (await rows(PRODUCTION_D1_ID, `SELECT name FROM pragma_table_info(?)`, [table.name])).map(
			(column) => column.name,
		);
		if (!columns.length) continue;
		const insert = `INSERT INTO ${quote(table.name)} (${columns.map(quote).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
		// D1 allows 100 bound parameters per statement and ~100 KB per request.
		const perBatch = Math.max(1, Math.min(50, Math.floor(1000 / columns.length)));
		for (let offset = 0; ; offset += 500) {
			const page = await rows(
				PRODUCTION_D1_ID,
				`SELECT ${columns.map(quote).join(", ")} FROM ${quote(table.name)} ORDER BY rowid LIMIT 500 OFFSET ${offset}`,
			);
			for (let i = 0; i < page.length; i += perBatch) {
				const batch = page.slice(i, i + perBatch).map((row) => ({
					sql: insert,
					params: columns.map((column) => {
						const value = row[column];
						if (value !== null && typeof value === "object")
							throw new Error(`${table.name}.${column} holds binary data, which this copy does not handle.`);
						return value;
					}),
				}));
				await query(targetId, { batch: [{ sql: "PRAGMA defer_foreign_keys = on" }, ...batch] });
			}
			copied += page.length;
			if (page.length < 500) break;
		}
	}
	await run(ofType("index"));
	await run([...ofType("trigger"), ...ofType("view")]);
	return copied;
}

async function deleteDatabase(databaseId) {
	await api(`/accounts/${account}/d1/database/${databaseId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- R2

const bucketPath = (bucket) => `/accounts/${account}/r2/buckets/${bucket}`;
const objectPath = (bucket, key) => `${bucketPath(bucket)}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;

async function bucketExists() {
	return (await api(bucketPath(name), { allow404: true })) !== undefined;
}

async function listObjects(bucket) {
	const keys = [];
	let cursor;
	do {
		const query = new URLSearchParams({ per_page: "1000", ...(cursor ? { cursor } : {}) });
		const json = await api(`${bucketPath(bucket)}/objects?${query}`);
		keys.push(...json.result.map((object) => object.key));
		cursor = json.result_info?.is_truncated ? json.result_info.cursor : undefined;
	} while (cursor);
	return keys;
}

async function copyProductionMedia() {
	const keys = await listObjects(PRODUCTION_R2);
	for (const key of keys) {
		const source = await api(objectPath(PRODUCTION_R2, key), { raw: true });
		const body = new Uint8Array(await source.arrayBuffer());
		const response = await fetch(`${API}${objectPath(name, key)}`, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": source.headers.get("content-type") ?? "application/octet-stream",
			},
			body,
		});
		if (!response.ok) throw new Error(`Copying ${key}: ${response.status} ${await response.text()}`);
	}
	return keys.length;
}

async function emptyAndDeleteBucket() {
	for (const key of await listObjects(name)) await api(objectPath(name, key), { method: "DELETE" });
	await api(bucketPath(name), { method: "DELETE" });
}

// ---------------------------------------------------------------- commands

function cf(cfArgs, { env = {}, fatal = true } = {}) {
	const run = spawnSync("npx", ["cf", ...cfArgs], { stdio: "inherit", env: { ...process.env, ...env } });
	if (run.status !== 0 && fatal) process.exit(run.status ?? 1);
	return run.status === 0;
}

if (command === "deploy") {
	let database = await findDatabase();
	const reseed = flag("reseed");
	if (database && reseed) {
		log(`Deleting ${name} (D1) to reseed it`);
		await deleteDatabase(database.uuid);
		database = undefined;
	}
	if (!database) {
		log(`Creating ${name} (D1) and copying production into it`);
		database = await createDatabase();
		log(`Copied ${await copyProduction(database.uuid)} rows`);
	} else {
		log(`Using existing ${name} (D1); pass --reseed to copy production again`);
	}

	if (!(await bucketExists())) {
		log(`Creating ${name} (R2) and copying production media into it`);
		await api(`/accounts/${account}/r2/buckets`, { method: "POST", body: { name, locationHint: LOCATION } });
		log(`Copied ${await copyProductionMedia()} media objects`);
	} else if (reseed) {
		log(`Recopying production media into ${name} (R2)`);
		log(`Copied ${await copyProductionMedia()} media objects`);
	} else {
		log(`Using existing ${name} (R2)`);
	}

	cf(["previews", "deploy", "--preview-name", branch], {
		env: { PREVIEW_D1_NAME: name, PREVIEW_D1_ID: database.uuid, PREVIEW_R2_BUCKET: name },
	});
} else {
	log(`Deleting the ${branch} preview`);
	// Keep going if the Worker Preview is already gone, so its storage still gets removed.
	cf(["previews", "delete", branch, "--worker", PREFIX, "--force"], { fatal: false });
	const database = await findDatabase();
	if (database) {
		await deleteDatabase(database.uuid);
		log(`Deleted ${name} (D1)`);
	}
	if (await bucketExists()) {
		await emptyAndDeleteBucket();
		log(`Deleted ${name} (R2)`);
	}
}
