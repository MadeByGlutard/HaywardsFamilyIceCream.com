/**
 * What makes a session or a reset link still good, given the password it was made under.
 * Every password change (reset, change, invite, setup) writes a new credential `updatedAt`;
 * anything stamped with an older one no longer works.
 */

export interface SessionUser {
	id: string;
	/** The credential's `updatedAt` when this session started. */
	since?: string | null;
}

export interface ResetLink {
	userId: string;
	expiresAt: number;
	/** The credential's `updatedAt` when the link was made (null: no password yet). */
	credentialAt?: string | null;
	/** When the link was made; only the newest link for a user works. */
	issuedAt?: number;
}

/** A session is current while the password hasn't changed since it began. */
export function sessionIsCurrent(user: SessionUser | undefined, credentialAt: string | null | undefined): boolean {
	if (!user?.id) return true;
	if (credentialAt == null) return true; // No password on record (not a password account): nothing to compare.
	return user.since === credentialAt;
}

/** A reset link works once, before it expires, only if it's the newest one and the password hasn't changed since. */
export function resetIsCurrent(reset: ResetLink, credentialAt: string | null | undefined, newestIssuedAt: number | undefined, now = Date.now()): boolean {
	if (reset.expiresAt < now) return false;
	if (reset.issuedAt == null || reset.issuedAt !== newestIssuedAt) return false;
	return (reset.credentialAt ?? null) === (credentialAt ?? null);
}
