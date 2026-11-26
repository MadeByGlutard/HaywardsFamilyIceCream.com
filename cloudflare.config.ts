import { bindings, defineConfig, triggers } from "cf/config";

// EMDASH_ENCRYPTION_KEY is a Worker secret. Locally it lives in .env
// (see .env.example); in production it is uploaded with `cf deploy --secrets-file`.

const PRODUCTION_D1 = {
	name: "haywardsfamilyicecream-com",
	id: "406e55ec-a241-4bad-a648-15dc41f01810",
};
const PRODUCTION_R2 = "haywardsfamilyicecream-com";
/** haywardsfamilyicecream-com-session: who is signed in. */
const PRODUCTION_KV = "1527cf00766d419599a8ef696b19dac9";

/**
 * Going live (README, "Going live"): set to true in the commit that moves the domain. Until then
 * haywardsfamilyicecream.com and www stay on Cloudflare Pages and this Worker serves neither.
 * Moving back is setting it to false and deploying, then reattaching the Pages project's domains.
 */
const SERVE_LIVE_DOMAIN = false;
const LIVE_DOMAINS = [
	{ hostname: "haywardsfamilyicecream.com", production: true, previews: false },
	{ hostname: "www.haywardsfamilyicecream.com", production: true, previews: false },
];

/**
 * Each preview gets its own D1 database and R2 bucket, seeded from production, and
 * its own KV namespace for sign-in sessions. They are created by `scripts/preview.mjs`, which passes them in through these
 * environment variables before running `cf previews deploy`.
 */
function previewResources() {
	const { PREVIEW_D1_NAME, PREVIEW_D1_ID, PREVIEW_R2_BUCKET, PREVIEW_KV_ID } = process.env;
	if (!PREVIEW_D1_NAME || !PREVIEW_D1_ID || !PREVIEW_R2_BUCKET || !PREVIEW_KV_ID) {
		throw new Error(
			"Preview builds need their own D1 database, R2 bucket and KV namespace. Deploy previews with `npm run preview:deploy`, not `cf previews deploy` directly.",
		);
	}
	return {
		d1: { name: PREVIEW_D1_NAME, id: PREVIEW_D1_ID },
		r2: PREVIEW_R2_BUCKET,
		kv: PREVIEW_KV_ID,
	};
}

export default defineConfig(({ isPreview }) => {
	const resources = isPreview
		? previewResources()
		: { d1: PRODUCTION_D1, r2: PRODUCTION_R2, kv: PRODUCTION_KV };

	return {
		worker: {
			name: "haywardsfamilyicecream-com",
			// workers.dev and preview URLs sit behind Cloudflare Access (invited emails
			// only), configured in Zero Trust. Access covers the workers.dev hostname and
			// this Worker's previews, so the custom domain stays public after cutover.
			workersDev: true,
			previewUrls: true,
			// Previews also answer at <branch>.previews.haywardsfamilyicecream.com (behind the same
			// Access app). Preview-only: this hostname never serves production, and the live site's
			// apex and www records are untouched.
			domains: [
				{ hostname: "previews.haywardsfamilyicecream.com", production: false, previews: true },
				...(SERVE_LIVE_DOMAIN ? LIVE_DOMAINS : []),
			],
			compatibilityDate: "2026-11-22",
			compatibilityFlags: ["nodejs_compat"],
			entrypoint: "./src/worker.ts",
			// Workers cache in front of the Worker; EmDash purges by tag on publish.
			cache: {
				enabled: true,
			},
			// Worker logs: errors, including failed cache purges, show in the dashboard.
			observability: { enabled: true },
			// EmDash's maintenance cron. Preview uploads can't carry triggers, and
			// previews never run crons anyway.
			...(isPreview ? {} : { triggers: [triggers.scheduled({ schedule: "* * * * *" })] }),
			env: {
				DB: bindings.d1(resources.d1),
				MEDIA: bindings.r2({ name: resources.r2 }),
				// Declared so previews get one: only a full deploy creates it by itself.
				SESSION: bindings.kv({ id: resources.kv }),
				// Runs plugins installed from the admin in their own isolates.
				LOADER: bindings.workerLoader(),
				// Invites and other admin mail (astro.config.mjs). Can only send as the admin.
				// Production only: previews have no way to send email.
				...(isPreview
					? {}
					: { EMAIL: bindings.sendEmail({ allowedSenderAddresses: ["cms@mail.haywardsfamilyicecream.com"] }) }),
			},
		},
	};
});
