import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP's 16 MiB scrypt setting. A Worker isolate has 128 MB in total, which rules out the
// larger-memory settings, and Workers caps PBKDF2 below OWASP's recommended iterations.
const N = 2 ** 14;
const R = 8;
const P = 5;
const KEY_LENGTH = 32;

export const MIN_LENGTH = 12;
export const MAX_LENGTH = 128;

export function passwordProblem(password: unknown): string | null {
	if (typeof password !== "string" || password.length < MIN_LENGTH)
		return `Use at least ${MIN_LENGTH} characters.`;
	if (password.length > MAX_LENGTH) return `Use at most ${MAX_LENGTH} characters.`;
	return null;
}

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number) {
	return new Promise<Buffer>((resolve, reject) =>
		scrypt(password.normalize("NFKC"), salt, length, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (error, key) =>
			error ? reject(error) : resolve(key),
		),
	);
}

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await derive(password, salt, N, R, P, KEY_LENGTH);
	return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

// Verified against when there is no stored hash, so unknown emails take as long as known ones.
const PLACEHOLDER = ["scrypt", N, R, P, Buffer.alloc(16).toString("base64"), Buffer.alloc(KEY_LENGTH).toString("base64")].join("$");

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
	const [scheme, n, r, p, salt, key] = (stored ?? PLACEHOLDER).split("$");
	if (scheme !== "scrypt" || !salt || !key) return false;
	const expected = Buffer.from(key, "base64");
	const actual = await derive(password, Buffer.from(salt, "base64"), Number(n), Number(r), Number(p), expected.length);
	return timingSafeEqual(actual, expected) && Boolean(stored);
}
