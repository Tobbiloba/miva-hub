"use client";

import { cn } from "lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { useId, useState } from "react";

const QUOTES = [
  {
    text: "Every answer should show where it came from. If your notes don’t cover something, Askly tells you instead of guessing.",
    by: "Our first principle · Sources",
  },
  {
    text: "Studying starts from your own course: your lecturer’s words, your week’s readings, your deadlines. Not the whole internet.",
    by: "Our second principle · Your course",
  },
  {
    text: "Small, steady sessions beat late-night cramming. A quiz here, ten flashcards there, and the week takes care of itself.",
    by: "Our third principle · Rhythm",
  },
];

/** Pale-lime quote card with "01 / 03" and square arrow buttons. */
export function QuoteSlider() {
  const [i, setI] = useState(0);
  const q = QUOTES[i];
  const go = (d: number) =>
    setI((v) => (v + d + QUOTES.length) % QUOTES.length);
  return (
    <div className="flex h-full flex-col rounded-[22px] bg-[#eef3d2] px-7 pt-10 pb-10 text-[#1d2a23] sm:px-10 sm:pt-12">
      <span className="text-[44px] leading-[0.6] italic text-[#1d2a23]">
        &rdquo;
      </span>
      <p
        key={i}
        className="mt-12 max-w-[820px] text-2xl leading-[1.22] tracking-[-0.01em] animate-in fade-in-0 duration-500 sm:text-[32px] lg:text-[40px]"
      >
        {q.text}
      </p>
      <p className="mt-10 text-xs tracking-[0.14em] text-[#3d4741] uppercase">
        {q.by}
      </p>
      <div className="mt-auto flex items-center justify-between pt-12">
        <span className="text-[13px] tabular-nums text-[#3d4741]">
          {String(i + 1).padStart(2, "0")} /{" "}
          {String(QUOTES.length).padStart(2, "0")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous quote"
            className="grid size-[52px] place-items-center rounded-[18px] bg-[#263c32] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowLeft className="size-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next quote"
            className="grid size-[52px] place-items-center rounded-[18px] bg-[#263c32] text-white transition-colors hover:bg-[#1f342b]"
          >
            <ArrowRight className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

const FAQS = [
  {
    q: "Where do Askly’s answers come from?",
    a: "From the lessons you capture: lecture videos, PDFs, quizzes and assignments from your courses. Every answer shows its sources, and when your materials don’t cover something, Askly says so instead of guessing.",
  },
  {
    q: "What can the Chrome extension capture?",
    a: "Video lessons, PDF notes, quiz pages and assignment pages on the MIVA LMS. It reads the course, week and lesson title from the page; you just press Capture.",
  },
  {
    q: "Do I need the extension to use Askly?",
    a: "No. You can chat, make quizzes and flashcards and track deadlines without it. The extension is what lets Askly answer from your own lectures.",
  },
  {
    q: "Who can see my captures?",
    a: "Only you. Askly reads content for the courses you’ve added, and you can remove a capture at any time from My Courses.",
  },
  {
    q: "When can I start?",
    a: "We’re letting students in in small groups. Join the waitlist and we’ll email you when your spot opens.",
  },
];

/** Hairline accordion; the first item starts open (minus), the rest plus. */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div>
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="border-b border-[#e2e2dd]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-[30px] text-left lg:pr-[30px]"
            >
              <span className="text-2xl tracking-[-0.01em] text-[#4a524c] sm:text-[30px]">
                {f.q}
              </span>
              {isOpen ? (
                <Minus
                  className="size-5 shrink-0 text-[#1d2a23]"
                  strokeWidth={1.5}
                />
              ) : (
                <Plus
                  className="size-5 shrink-0 text-[#1d2a23]"
                  strokeWidth={1.5}
                />
              )}
            </button>
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <p className="overflow-hidden pr-10 text-lg leading-[1.5] text-[#6f7570] lg:text-[19px]">
                <span className="block pb-7">{f.a}</span>
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type WaitlistState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done" }
  | { kind: "error"; message: string };

/**
 * Waitlist form for the dark footer. Same contract as the main landing's
 * form: POST /api/waitlist {email, source}, idempotent per email.
 */
export function WaitlistForm({ source }: { source: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<WaitlistState>({ kind: "idle" });

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
      <p
        role="status"
        aria-live="polite"
        className="flex max-w-[460px] items-center gap-3 rounded-[18px] bg-white/[0.06] p-4 text-base"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#d6eb9a] text-[#1d2a23]">
          <Check className="size-4" />
        </span>
        You&apos;re on the list. We&apos;ll email you when your spot opens.
      </p>
    );
  }

  const loading = state.kind === "loading";
  return (
    <form onSubmit={submit} noValidate className="w-full max-w-[460px]">
      <div className="flex flex-col gap-2 rounded-[20px] bg-white/[0.07] p-1.5 ring-1 ring-white/10 transition focus-within:ring-white/30 sm:h-[60px] sm:flex-row sm:items-center sm:pl-5">
        <label htmlFor={`${id}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@miva.edu.ng"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-invalid={state.kind === "error"}
          aria-describedby={state.kind === "error" ? `${id}-err` : undefined}
          disabled={loading}
          className="h-12 min-w-0 flex-1 bg-transparent px-3.5 text-base text-white outline-none placeholder:text-white/40 sm:h-full sm:px-0"
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
          className="group inline-flex h-12 shrink-0 items-center justify-between gap-4 rounded-[15px] whitespace-nowrap bg-[#f6f5f1] pr-2 pl-4 text-[15px] text-[#1d2a23] transition-colors hover:bg-white disabled:opacity-60"
        >
          {loading ? "Joining…" : "Join the waitlist"}
          <span className="grid size-8 place-items-center rounded-[9px] bg-[#263c32] text-white">
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" strokeWidth={1.75} />
            )}
          </span>
        </button>
      </div>
      {state.kind === "error" ? (
        <p
          id={`${id}-err`}
          role="alert"
          className="mt-3 px-1 text-sm text-[#f3a99a]"
        >
          {state.message}
        </p>
      ) : (
        <p className="mt-3 px-1 text-sm text-white/55">
          Early access for students. One email when it&apos;s your turn.
        </p>
      )}
    </form>
  );
}
