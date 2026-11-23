import { bindings, defineConfig, triggers } from "cf/config";

// EMDASH_ENCRYPTION_KEY is a Worker secret. Locally it lives in .env
// (see .env.example); in production it is uploaded with `cf deploy --secrets-file`.

const PRODUCTION_D1 = {
	name: "haywardsfamilyicecream-com",
	id: "406e55ec-a241-4bad-a648-15dc41f01810",
};
const PRODUCTION_R2 = "haywardsfamilyicecream-com";

/**
 * Each preview gets its own D1 database and R2 bucket, created and seeded from
 * production by `scripts/preview.mjs`, which passes them in through these
 * environment variables before running `cf previews deploy`.
 */
function previewResources() {
	const { PREVIEW_D1_NAME, PREVIEW_D1_ID, PREVIEW_R2_BUCKET } = process.env;
	if (!PREVIEW_D1_NAME || !PREVIEW_D1_ID || !PREVIEW_R2_BUCKET) {
		throw new Error(
			"Preview builds need their own D1 database and R2 bucket. Deploy previews with `npm run preview:deploy`, not `cf previews deploy` directly.",
		);
	}
	return {
		d1: { name: PREVIEW_D1_NAME, id: PREVIEW_D1_ID },
		r2: PREVIEW_R2_BUCKET,
	};
}

export default defineConfig(({ isPreview }) => {
	const resources = isPreview
		? previewResources()
		: { d1: PRODUCTION_D1, r2: PRODUCTION_R2 };

	return {
		worker: {
			name: "haywardsfamilyicecream-com",
			// workers.dev and preview URLs sit behind Cloudflare Access (invited emails
			// only), configured in Zero Trust. Access covers the workers.dev hostname and
			// this Worker's previews, so the custom domain stays public after cutover.
			workersDev: true,
			previewUrls: true,
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
			},
		},
	};
});
