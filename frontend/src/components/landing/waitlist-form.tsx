"use client";

import { useId, useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done" }
  | { kind: "error"; message: string };

/** Email-only waitlist pill; posts to /api/waitlist (idempotent per email). */
export function WaitlistForm({ source }: { source: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state.kind === "loading") return;
    // Honeypot: bots fill every field, people never see this one
    if (new FormData(e.currentTarget).get("company")) {
      return setState({ kind: "done" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      return setState({
        kind: "error",
        message: "Enter a valid email address.",
      });
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (res.ok) return setState({ kind: "done" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setState({
        kind: "error",
        message: data.error ?? "Something went wrong. Try again in a moment.",
      });
    } catch {
      setState({
        kind: "error",
        message: "No connection. Check your internet and try again.",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <div className="waitlist-done" role="status" aria-live="polite">
        <strong>You&apos;re on the list.</strong>
        <span>We&apos;ll email you when your spot opens. Nothing else.</span>
      </div>
    );
  }

  const loading = state.kind === "loading";
  return (
    <form className="waitlist" onSubmit={submit} noValidate>
      <div className="waitlist-row">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@miva.edu.ng"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-invalid={state.kind === "error"}
          aria-describedby={state.kind === "error" ? `${id}-err` : undefined}
          disabled={loading}
        />
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hp"
        />
        <button
          type="submit"
          className="btn btn-ink"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Joining…" : "Join the waitlist"}
        </button>
      </div>
      {state.kind === "error" ? (
        <p id={`${id}-err`} className="waitlist-msg error" role="alert">
          {state.message}
        </p>
      ) : (
        <p className="waitlist-msg">
          Early access for students. One email when it&apos;s your turn.
        </p>
      )}
    </form>
  );
}
