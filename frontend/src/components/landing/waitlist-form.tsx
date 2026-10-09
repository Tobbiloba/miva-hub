"use client";

import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done" }
  | { kind: "error"; message: string };

/** Email waitlist form; posts to /api/waitlist (idempotent per email). */
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
      <div
        className="flex items-center gap-3 rounded border border-white/10 bg-white/5 p-4 text-sm sm:text-base"
        role="status"
        aria-live="polite"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded bg-lime-400 text-black">
          <Check className="size-4" />
        </span>
        <span>
          You&apos;re on the list. We&apos;ll email you when your spot opens.
        </span>
      </div>
    );
  }

  const loading = state.kind === "loading";
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-xl">
      <div className="flex flex-col gap-2 rounded bg-white p-1.5 sm:flex-row sm:items-center">
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
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-black outline-none placeholder:text-neutral-500"
        />
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute -left-[9999px] size-px opacity-0"
        />
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="flex h-11 items-center justify-center gap-2 rounded bg-black pr-1.5 pl-5 text-sm font-medium text-white transition-all hover:gap-3 disabled:opacity-60 sm:text-base"
        >
          {loading ? "Joining…" : "Join the waitlist"}
          <span className="rounded bg-lime-400 p-2 text-black">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </span>
        </button>
      </div>
      {state.kind === "error" ? (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm text-red-400">
          {state.message}
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-400">
          Early access for students. One email when it&apos;s your turn.
        </p>
      )}
    </form>
  );
}
