"use client";

import { cn } from "lib/utils";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { btnPrimary } from "./styles";

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
        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm sm:text-base"
        role="status"
        aria-live="polite"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
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
      <div className="flex flex-col gap-2 rounded-[28px] border border-white/10 bg-white/[0.06] p-1.5 transition-colors focus-within:border-brand/60 sm:flex-row sm:items-center sm:rounded-full">
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
          className="h-11 min-w-0 flex-1 bg-transparent px-4 text-base text-foreground outline-none placeholder:text-muted-foreground"
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
          className={cn(btnPrimary, "disabled:opacity-60")}
        >
          {loading ? "Joining…" : "Join the waitlist"}
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
      {state.kind === "error" ? (
        <p
          id={`${id}-err`}
          role="alert"
          className="mt-3 px-4 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : (
        <p className="mt-3 px-4 text-sm text-muted-foreground">
          Early access for students. One email when it&apos;s your turn.
        </p>
      )}
    </form>
  );
}
