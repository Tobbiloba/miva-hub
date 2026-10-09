"use client";

import { cn } from "lib/utils";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "error"; message: string };

const ROLES = [
  { value: "student", label: "Student" },
  { value: "lecturer", label: "Lecturer" },
  { value: "other", label: "Other" },
] as const;

/** Join-the-waitlist form; posts to /api/waitlist. */
export function WaitlistForm({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
          university: form.get("university"),
          role: form.get("role"),
          source,
        }),
      });
      if (res.ok) return setStatus({ kind: "done" });
      const data = await res.json().catch(() => ({}));
      setStatus({
        kind: "error",
        message: data.error ?? "Something went wrong. Please try again.",
      });
    } catch {
      setStatus({
        kind: "error",
        message: "You seem to be offline. Please try again.",
      });
    }
  }

  if (status.kind === "done") {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-8 text-center text-neutral-900",
          className,
        )}
      >
        <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
        <p className="font-display text-2xl font-bold">
          You&apos;re on the list
        </p>
        <p className="max-w-sm text-sm text-neutral-600">
          We&apos;ll email you as soon as Askly opens for your university.
        </p>
      </div>
    );
  }

  const field =
    "h-11 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#2f6bff]/60 focus:ring-4 focus:ring-[#2f6bff]/10";

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-xl sm:grid-cols-2 sm:p-6",
        className,
      )}
    >
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@university.edu.ng"
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        Name <span className="sr-only">(optional)</span>
        <input
          name="name"
          autoComplete="name"
          placeholder="Optional"
          className={field}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium">
        I&apos;m a
        <select name="role" defaultValue="student" className={field}>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium sm:col-span-2">
        University <span className="sr-only">(optional)</span>
        <input
          name="university"
          autoComplete="organization"
          placeholder="Optional"
          className={field}
        />
      </label>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2">
          {status.message}
        </p>
      )}
      <button
        type="submit"
        disabled={status.kind === "sending"}
        className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60 sm:col-span-2"
      >
        {status.kind === "sending" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ArrowRight className="size-4" />
        )}
        Join the waitlist
      </button>
      <p className="text-center text-xs text-neutral-500 sm:col-span-2">
        No spam. One email when Askly opens for you.
      </p>
    </form>
  );
}
