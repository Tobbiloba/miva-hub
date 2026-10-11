"use client";

import { PageHeader } from "@/components/layouts/page-header";
import { cn } from "lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Loader2,
  PlugZap,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { AutoCapture } from "./auto-capture";
import {
  type Capture,
  CaptureRow,
  INSTALL_URL,
  useCaptures,
} from "./captures-panel";
import { type ExtensionStatus, useAsklyExtension } from "./use-askly-extension";

type Course = { id: string; code: string; title: string };
type Connection = {
  connected: boolean;
  devices: number;
  connectedAt: string | null;
  lastUsedAt: string | null;
};
type Filter = "all" | "ready" | "processing" | "attention";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready" },
  { key: "processing", label: "Processing" },
  { key: "attention", label: "Needs attention" },
];

const inFilter = (c: Capture, f: Filter) =>
  f === "all" ||
  (f === "ready" && c.state === "ready") ||
  (f === "processing" &&
    (c.state === "processing" || c.state === "in_review")) ||
  (f === "attention" && (c.state === "failed" || c.state === "no_text"));

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/**
 * The Askly Capture page: whether the extension is connected, what's been
 * captured per course, and every capture with its state (retry/remove).
 */
export function CaptureHub({
  courses,
  pendingSchool,
  lmsSupported,
}: {
  courses: Course[];
  pendingSchool: string | null;
  /** Automatic capture knows this student's LMS (MIVA's, for now) */
  lmsSupported: boolean;
}) {
  const { captures, error, isLoading, reload, busy, retry, remove } =
    useCaptures();
  const extension = useAsklyExtension();
  const [filter, setFilter] = useState<Filter>("all");
  const [courseId, setCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: captures.length,
      ready: captures.filter((c) => inFilter(c, "ready")).length,
      processing: captures.filter((c) => inFilter(c, "processing")).length,
      attention: captures.filter((c) => inFilter(c, "attention")).length,
    }),
    [captures],
  );

  // Every enrolled course, plus any course a capture landed in
  const byCourse = useMemo(() => {
    const map = new Map<string, Course & { total: number; ready: number }>();
    for (const c of courses) map.set(c.id, { ...c, total: 0, ready: 0 });
    for (const cap of captures) {
      const row = map.get(cap.course.id) ?? {
        ...cap.course,
        total: 0,
        ready: 0,
      };
      row.total++;
      if (cap.state === "ready") row.ready++;
      map.set(cap.course.id, row);
    }
    return [...map.values()].sort(
      (a, b) => b.total - a.total || a.code.localeCompare(b.code),
    );
  }, [courses, captures]);

  const q = query.trim().toLowerCase();
  const shown = captures.filter(
    (c) =>
      inFilter(c, filter) &&
      (!courseId || c.course.id === courseId) &&
      (!q ||
        c.title.toLowerCase().includes(q) ||
        c.course.code.toLowerCase().includes(q)),
  );
  const activeCourse = byCourse.find((c) => c.id === courseId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        title="Askly Capture"
        description="Askly saves your lecture videos, readings, slides and assignments from your LMS, and answers from them in chat."
        actions={
          INSTALL_URL ? (
            <Button asChild className="min-h-11">
              <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 size-4" /> Get the extension
              </a>
            </Button>
          ) : undefined
        }
      />

      {pendingSchool && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3.5 text-sm"
        >
          <Clock
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <p>
            <span className="font-medium">
              Capturing starts once {pendingSchool} is on Askly.
            </span>{" "}
            <span className="text-muted-foreground">
              Captures are filed under your courses, and those come from your
              school. We&apos;ll email you when it&apos;s added.
            </span>
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ConnectionCard
          installed={extension.installed}
          status={extension.status}
          call={extension.call}
        />
        <section aria-label="Capture totals" className="grid grid-cols-2 gap-3">
          <StatTile
            label="Captured"
            value={counts.all}
            // "All" is the resting state, not a choice worth highlighting
            active={false}
            onClick={() => setFilter("all")}
            loading={isLoading}
          />
          <StatTile
            label="Ready to ask about"
            value={counts.ready}
            tone="good"
            active={filter === "ready"}
            onClick={() => setFilter("ready")}
            loading={isLoading}
          />
          <StatTile
            label="Processing"
            value={counts.processing}
            active={filter === "processing"}
            onClick={() => setFilter("processing")}
            loading={isLoading}
          />
          <StatTile
            label="Needs attention"
            value={counts.attention}
            tone={counts.attention > 0 ? "warn" : undefined}
            active={filter === "attention"}
            onClick={() => setFilter("attention")}
            loading={isLoading}
          />
        </section>
      </div>

      {lmsSupported && !pendingSchool && (
        <AutoCapture
          extension={extension.status}
          call={extension.call}
          onProgress={reload}
        />
      )}

      {!isLoading && !error && captures.length === 0 && (
        <HowItWorks auto={lmsSupported && !pendingSchool} />
      )}

      {byCourse.length > 0 && (
        <section aria-labelledby="courses-title" className="space-y-3">
          <h2 id="courses-title" className="text-[15px] font-semibold">
            By course
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byCourse.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={courseId === c.id}
                  onClick={() => setCourseId(courseId === c.id ? null : c.id)}
                  className={cn(
                    "flex min-h-11 w-full flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-offset-2",
                    courseId === c.id && "border-foreground",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{c.code}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {c.total === 0
                        ? "Nothing yet"
                        : `${c.ready} of ${c.total} ready`}
                    </span>
                  </span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {c.title}
                  </span>
                  <span
                    className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                    aria-hidden
                  >
                    <span
                      className="block h-full rounded-full bg-success transition-[width] duration-500"
                      style={{
                        width: `${c.total ? (c.ready / c.total) * 100 : 0}%`,
                      }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="library-title"
        className="space-y-3 rounded-xl border bg-card p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="library-title" className="text-[15px] font-semibold">
            Everything you&apos;ve captured
          </h2>
          <label className="relative sm:w-64">
            <span className="sr-only">Search captures</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="capture-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or course"
              className="min-h-11 pl-9"
            />
          </label>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter captures"
        >
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
                filter === f.key
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-secondary",
              )}
            >
              {f.label}
              <span className="tabular-nums opacity-70">{counts[f.key]}</span>
            </button>
          ))}
          {activeCourse && (
            <button
              type="button"
              onClick={() => setCourseId(null)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed px-3.5 text-sm hover:bg-secondary"
              aria-label={`Show all courses (now ${activeCourse.code})`}
            >
              {activeCourse.code} <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        {error ? (
          <div role="alert" className="flex items-center gap-3 py-4 text-sm">
            <AlertCircle className="size-4 text-destructive" aria-hidden />
            <span className="flex-1">{error.message}</span>
            <Button variant="outline" className="min-h-11" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-8" aria-label="Loading">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {captures.length === 0
              ? "Nothing captured yet."
              : "No captures match. Try another filter or search."}
          </p>
        ) : (
          <ul className="divide-y">
            {shown.map((capture) => (
              <CaptureRow
                key={capture.key}
                capture={capture}
                busy={busy === capture.key}
                onRetry={retry}
                onRemove={remove}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  active,
  onClick,
  loading,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn";
  active: boolean;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 flex-col items-start justify-between gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30",
        active && "border-foreground",
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[28px] leading-none font-semibold tabular-nums tracking-[-0.02em]",
          tone === "good" && value > 0 && "text-success",
          tone === "warn" && "text-amber-700 dark:text-amber-400",
        )}
      >
        {loading ? "–" : value}
      </span>
    </button>
  );
}

const connectionFetcher = async (url: string): Promise<Connection> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't check the extension");
  return res.json();
};

function ConnectionCard({
  installed,
  status,
  call,
}: {
  installed: boolean | null;
  status: ExtensionStatus | null;
  call: (type: string, payload?: Record<string, unknown>) => Promise<any>;
}) {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/student/capture/connection",
    connectionFetcher,
    // Picks up a fresh sign-in from the extension while the page is open
    { refreshInterval: (d) => (d?.connected ? 0 : 10_000) },
  );
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // This browser's extension isn't signed in (another browser's may be)
  const canConnect = installed === true && !!status && !status.connected;

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/student/capture/connection", {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't connect");
      await call("CONNECT", {
        token: body.token,
        expiresAt: body.expires_at,
        user: body.user,
      });
      toast.success("Askly Capture is connected");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't connect");
    } finally {
      setConnecting(false);
    }
  }

  // The extension's popup sends students here with ?connect=1
  const autoConnected = useRef(false);
  useEffect(() => {
    if (autoConnected.current || !canConnect) return;
    if (new URLSearchParams(window.location.search).get("connect") !== "1")
      return;
    autoConnected.current = true;
    connect();
    // connect() only reads stable values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canConnect]);

  async function disconnect() {
    setSigningOut(true);
    const res = await fetch("/api/student/capture/connection", {
      method: "DELETE",
    });
    setSigningOut(false);
    setConfirming(false);
    if (!res.ok) {
      toast.error("Couldn't sign the extension out. Try again.");
      return;
    }
    // Also forget it in this browser's extension (it'd find out on its next call)
    if (installed) await call("DISCONNECT").catch(() => {});
    toast.success("Signed out of Askly Capture");
    mutate({
      connected: false,
      devices: 0,
      connectedAt: null,
      lastUsedAt: null,
    });
  }

  return (
    <section
      aria-labelledby="connection-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl border bg-secondary">
          <PlugZap className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="connection-title" className="text-[15px] font-semibold">
            Chrome extension
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : error ? (
            <p className="text-sm text-destructive">
              Couldn&apos;t check the extension.
            </p>
          ) : data?.connected || status?.connected ? (
            <p className="flex items-center gap-2 text-sm">
              <span className="relative flex size-2.5" aria-hidden>
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-success" />
              </span>
              Connected
            </p>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="inline-flex size-2.5 rounded-full bg-muted-foreground/40"
                aria-hidden
              />
              Not connected
            </p>
          )}
        </div>
      </div>

      {error ? (
        <Button
          variant="outline"
          className="min-h-11 self-start"
          onClick={() => mutate()}
        >
          Try again
        </Button>
      ) : canConnect ? (
        <>
          <p className="text-sm text-muted-foreground">
            {data?.connected
              ? "Askly Capture is signed in on another browser. Connect this one too."
              : "Askly Capture is installed. Connect it to your Askly account in one click."}
          </p>
          <Button
            className="min-h-11 self-start"
            disabled={connecting}
            onClick={connect}
          >
            {connecting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <PlugZap className="mr-2 size-4" />
            )}
            Connect
          </Button>
        </>
      ) : data?.connected ? (
        <>
          <p className="text-sm text-muted-foreground">
            Last used {ago(data.lastUsedAt)}
            {data.devices > 1 && ` · signed in on ${data.devices} browsers`}
            {status?.version && ` · version ${status.version}`}.
          </p>
          {confirming ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">Sign the extension out?</span>
              <Button
                variant="destructive"
                className="min-h-11"
                disabled={signingOut}
                onClick={disconnect}
              >
                {signingOut && <Loader2 className="mr-2 size-4 animate-spin" />}
                Sign out
              </Button>
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="min-h-11 self-start"
              onClick={() => setConfirming(true)}
            >
              Sign the extension out
            </Button>
          )}
        </>
      ) : !isLoading ? (
        <p className="text-sm text-muted-foreground">
          {installed === null
            ? "Looking for the extension…"
            : INSTALL_URL
              ? "Install Askly Capture in Chrome, then come back here and press Connect."
              : "Askly Capture is coming to the Chrome Web Store. Once it's installed, connect it here in one click."}
        </p>
      ) : null}
    </section>
  );
}

function HowItWorks({ auto }: { auto: boolean }) {
  const steps = [
    {
      Icon: Download,
      title: "Install and connect",
      body: "Add the Askly Capture extension to Chrome and press Connect on this page.",
    },
    auto
      ? {
          Icon: Layers,
          title: "Press Capture my courses",
          body: "It goes through your LMS courses on its own. You can keep using Chrome.",
        }
      : {
          Icon: Layers,
          title: "Open a lesson on your LMS",
          body: "A lecture video, a PDF, a quiz or an assignment page, then press Capture in the extension.",
        },
    {
      Icon: CheckCircle2,
      title: "Ask about it",
      body: "Askly reads each lesson, and you can ask about it in chat a minute later.",
    },
  ];
  return (
    <section aria-labelledby="how-title" className="space-y-3">
      <h2 id="how-title" className="text-[15px] font-semibold">
        How it works
      </h2>
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="rounded-xl border bg-card p-4">
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              Step {i + 1}
            </span>
            <p className="mt-2 flex items-center gap-2 font-medium">
              <s.Icon className="size-4" aria-hidden /> {s.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
