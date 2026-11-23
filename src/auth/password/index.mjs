// Email and password sign-in for the EmDash admin (EmDash itself only ships passkeys,
// magic links and OAuth). See "Sign-in" in the README.

const API = "/_emdash/api/auth/password";
const PAGES = "/_emdash/password";
const DIR = "./src/auth/password";

/** @returns {import("emdash").AuthProviderDescriptor} */
export function password() {
	return {
		id: "password",
		label: "Email and password",
		adminEntry: "/src/auth/password/admin.tsx",
		routes: [
			{ pattern: `${API}/setup`, entrypoint: `${DIR}/api/setup.ts` },
			{ pattern: `${API}/login`, entrypoint: `${DIR}/api/login.ts` },
			{ pattern: `${API}/accept`, entrypoint: `${DIR}/api/accept.ts` },
			{ pattern: `${API}/reset`, entrypoint: `${DIR}/api/reset.ts` },
			{ pattern: `${API}/change`, entrypoint: `${DIR}/api/change.ts` },
			{ pattern: `${API}/reset-link`, entrypoint: `${DIR}/api/reset-link.ts` },
			{ pattern: `${PAGES}/login`, entrypoint: `${DIR}/pages/login.astro` },
			{ pattern: `${PAGES}/accept`, entrypoint: `${DIR}/pages/accept.astro` },
			{ pattern: `${PAGES}/reset`, entrypoint: `${DIR}/pages/reset.astro` },
			{ pattern: `${PAGES}/account`, entrypoint: `${DIR}/pages/account.astro` },
			{ pattern: `${PAGES}/users`, entrypoint: `${DIR}/pages/users.astro` },
		],
		// `change` and `reset-link` are left out on purpose: they need a signed-in user.
		publicRoutes: [`${API}/setup`, `${API}/login`, `${API}/accept`, `${API}/reset`],
		storage: { credentials: { indexes: [] }, resets: { indexes: [] } },
	};
}
