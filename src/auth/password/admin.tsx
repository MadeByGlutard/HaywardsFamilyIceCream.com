// Pieces EmDash's own admin renders: the button on its setup and invite screens, and the
// "create admin" step in the setup wizard. Everything else is a page under /_emdash/password.
import * as React from "react";

const box: React.CSSProperties = { display: "block", width: "100%", padding: "0.5rem", border: "1px solid #888", borderRadius: 4, font: "inherit" };

export function LoginButton({ inviteToken }: { inviteToken?: string } = {}) {
	const style: React.CSSProperties = { display: "block", width: "100%", padding: "0.5rem", border: "1px solid #888", borderRadius: 6, textAlign: "center" };
	if (inviteToken)
		return (
			<a style={style} href={`/_emdash/password/accept?token=${encodeURIComponent(inviteToken)}`}>
				Email and password
			</a>
		);
	return (
		<button type="button" style={style}>
			Email and password
		</button>
	);
}

export function SetupStep({ onComplete }: { onComplete: () => void }) {
	const [error, setError] = React.useState("");
	const [busy, setBusy] = React.useState(false);

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
		if (data.password !== data.confirm) return setError("The passwords don't match.");
		setBusy(true);
		setError("");
		try {
			const response = await fetch("/_emdash/api/auth/password/setup", {
				method: "POST",
				headers: { "Content-Type": "application/json", "X-EmDash-Request": "1" },
				body: JSON.stringify({ password: data.password }),
			});
			const result = (await response.json().catch(() => null)) as any;
			if (response.ok) return onComplete();
			setError(result?.error?.message ?? "Something went wrong. Try again.");
		} catch {
			setError("Could not reach the site. Try again.");
		}
		setBusy(false);
	}

	return (
		<form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
			<label>Password (at least 12 characters) <input style={box} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
			<label>Repeat it <input style={box} name="confirm" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
			<button type="submit" disabled={busy} style={{ ...box, fontWeight: 600, cursor: "pointer" }}>Create admin account</button>
			<p role="alert">{error}</p>
		</form>
	);
}
