import { bindings, defineConfig, triggers } from "cf/config";

// EMDASH_ENCRYPTION_KEY is a Worker secret. Locally it lives in .env
// (see .env.example); in production it is uploaded with `cf deploy --secrets-file`.

export default defineConfig({
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
		// EmDash's maintenance cron.
		triggers: [triggers.scheduled({ schedule: "* * * * *" })],
		env: {
			DB: bindings.d1({
				name: "haywardsfamilyicecream-com",
				id: "406e55ec-a241-4bad-a648-15dc41f01810",
			}),
			MEDIA: bindings.r2({ name: "haywardsfamilyicecream-com" }),
		},
	},
});
