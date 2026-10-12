"use client";

import type { CaptureSyncCourse } from "app-types/capture-sync";
import { cn } from "lib/utils";
import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Square,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "ui/button";
import { Checkbox } from "ui/checkbox";
import type { ExtensionStatus, LmsCourseOption } from "./use-askly-extension";

export const LMS_LOGIN_URL = "https://lms.miva.university/login/index.php";

type Sync = {
  status: "running" | "done" | "stopped" | "needs_login" | "failed";
  courses: CaptureSyncCourse[];
  currentItem: string | null;
  error: string | null;
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

type Planned = {
  lmsId: number;
  code: string | null;
  title: string;
  status: "enrolled" | "available" | "missing" | "requested" | "unrecognised";
};

type Step =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "login" }
  | { kind: "error"; message: string }
  | {
      kind: "pick";
      options: (LmsCourseOption & Planned)[];
      picked: Set<number>;
      starting: boolean;
    };

const syncFetcher = async (url: string): Promise<Sync | null> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load automatic capture");
  return (await res.json()).sync;
};

const PLAN_LABEL: Record<Planned["status"], string> = {
  enrolled: "In your courses",
  available: "Will be added to your courses",
  missing: "Askly will ask to add it",
  requested: "Waiting for Askly to add it",
  unrecognised: "No course code",
};

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
 * "Capture my courses": the extension walks the student's LMS courses on its
 * own and files every lesson; this card picks the courses, shows the run
 * live, and remembers the daily sync.
 */
export function AutoCapture({
  extension,
  call,
  onProgress,
}: {
  extension: ExtensionStatus | null;
  call: (type: string, payload?: Record<string, unknown>) => Promise<any>;
  /** New lessons landed: refresh the captures list */
  onProgress: () => void;
}) {
  const {
    data: sync,
    error,
    mutate,
  } = useSWR("/api/ingest/sync", syncFetcher, {
    refreshInterval: (d) =>
      d?.status === "running" || extension?.syncing ? 3000 : 60_000,
  });
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [stopping, setStopping] = useState(false);

  // Each progress report means new captures; refresh the list with it
  const lastUpdate = useRef<string | null>(null);
  useEffect(() => {
    if (!sync?.updatedAt || sync.updatedAt === lastUpdate.current) return;
    if (lastUpdate.current) onProgress();
    lastUpdate.current = sync.updatedAt;
  }, [sync?.updatedAt, onProgress]);

  const connected = !!extension?.connected;
  const running = sync?.status === "running" && !!extension?.syncing;

  async function chooseCourses() {
    setStep({ kind: "reading" });
    try {
      const lms = await call("LIST_LMS_COURSES");
      if (!lms.loggedIn) {
        setStep({ kind: "login" });
        return;
      }
      if (!lms.courses.length) {
        setStep({
          kind: "error",
          message: "Your LMS didn't list any courses.",
        });
        return;
      }
      const res = await fetch("/api/ingest/sync/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courses: lms.courses.map((c: LmsCourseOption) => ({
            lmsId: c.lmsId,
            shortname: c.shortname,
            fullname: c.fullname,
          })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't match your courses");
      const planned = new Map<number, Planned>(
        body.courses.map((p: Planned) => [p.lmsId, p]),
      );
      const options = (lms.courses as LmsCourseOption[])
        .map((c) => ({ ...c, ...planned.get(c.lmsId)! }))
        .filter((c) => c.status)
        // Current courses first, then by code; ones without a code last
        .sort(
          (a, b) =>
            Number(a.status === "unrecognised") -
              Number(b.status === "unrecognised") ||
            Number(b.inProgress) - Number(a.inProgress) ||
            (a.code ?? "~").localeCompare(b.code ?? "~"),
        );
      // Start from the last run's courses, else what the LMS calls current
      const previous = new Set(sync?.courses.map((c) => c.lmsId) ?? []);
      const picked = new Set(
        options
          .filter((o) => (previous.size ? previous.has(o.lmsId) : o.inProgress))
          .filter((o) => o.status !== "unrecognised")
          .map((o) => o.lmsId),
      );
      setStep({ kind: "pick", options, picked, starting: false });
    } catch (e) {
      setStep({
        kind: "error",
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  }

  async function start() {
    if (step.kind !== "pick") return;
    const courses = step.options
      .filter((o) => step.picked.has(o.lmsId))
      .map((o) => ({
        lmsId: o.lmsId,
        shortname: o.shortname,
        fullname: o.fullname,
      }));
    setStep({ ...step, starting: true });
    try {
      await call("START_SYNC", { courses });
      setStep({ kind: "idle" });
      toast.success("Capturing your courses. You can leave this page.");
      mutate();
    } catch (e) {
      setStep({ ...step, starting: false });
      toast.error(e instanceof Error ? e.message : "Couldn't start");
    }
  }

  async function syncNow() {
    try {
      await call("SYNC_NOW");
      toast.success("Checking your courses for new lessons");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start");
    }
  }

  async function stop() {
    setStopping(true);
    try {
      await call("STOP_SYNC");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't stop");
    } finally {
      setStopping(false);
    }
  }

  return (
    <section
      aria-labelledby="auto-title"
      className="space-y-4 rounded-xl border bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-secondary">
          <Wand2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="auto-title" className="text-[15px] font-semibold">
            Capture my courses
          </h2>
          <p className="text-sm text-muted-foreground">
            The extension goes through your LMS courses by itself and saves
            every video, reading, slide deck and assignment. Then it checks for
            new lessons once a day.
          </p>
        </div>
      </div>

      {!connected ? (
        <p className="rounded-lg bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
          Connect the extension above to start.
        </p>
      ) : error ? (
        <div role="alert" className="flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 text-destructive" aria-hidden />
          <span className="flex-1">{error.message}</span>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => mutate()}
          >
            Try again
          </Button>
        </div>
      ) : step.kind === "pick" ? (
        <CoursePicker
          step={step}
          onToggle={(id) => {
            const picked = new Set(step.picked);
            if (picked.has(id)) picked.delete(id);
            else picked.add(id);
            setStep({ ...step, picked });
          }}
          onCancel={() => setStep({ kind: "idle" })}
          onStart={start}
        />
      ) : step.kind === "reading" ? (
        <p className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Reading your
          LMS courses…
        </p>
      ) : step.kind === "login" ? (
        <div className="space-y-3 rounded-lg bg-secondary px-3.5 py-3 text-sm">
          <p>
            <span className="font-medium">Log in to your LMS first.</span> The
            extension uses your own LMS login, in this browser, to read your
            courses.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11">
              <a href={LMS_LOGIN_URL} target="_blank" rel="noopener noreferrer">
                Open the LMS <ExternalLink className="ml-2 size-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={chooseCourses}
            >
              I&apos;ve logged in
            </Button>
          </div>
        </div>
      ) : running && sync ? (
        <RunProgress sync={sync} stopping={stopping} onStop={stop} />
      ) : (
        <>
          {step.kind === "error" && (
            <p
              role="alert"
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" aria-hidden /> {step.message}
            </p>
          )}
          {sync && <LastRun sync={sync} />}
          <div className="flex flex-wrap gap-2">
            {sync?.courses.length ? (
              <>
                <Button className="min-h-11" onClick={syncNow}>
                  <RefreshCw className="mr-2 size-4" /> Sync now
                </Button>
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={chooseCourses}
                >
                  Change courses
                </Button>
              </>
            ) : (
              <Button className="min-h-11" onClick={chooseCourses}>
                <Wand2 className="mr-2 size-4" /> Capture my courses
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function CoursePicker({
  step,
  onToggle,
  onCancel,
  onStart,
}: {
  step: Extract<Step, { kind: "pick" }>;
  onToggle: (lmsId: number) => void;
  onCancel: () => void;
  onStart: () => void;
}) {
  const count = step.picked.size;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your current courses are ticked. Courses Askly doesn&apos;t have yet are
        sent to Askly to add; they&apos;re captured once they&apos;re in.
      </p>
      <ul
        className="max-h-[420px] divide-y overflow-y-auto rounded-lg border"
        aria-label="Your LMS courses"
      >
        {step.options.map((o) => {
          const disabled = o.status === "unrecognised";
          const id = `lms-course-${o.lmsId}`;
          return (
            <li key={o.lmsId}>
              <label
                htmlFor={id}
                className={cn(
                  "flex min-h-14 cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-secondary/60",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <Checkbox
                  id={id}
                  checked={step.picked.has(o.lmsId)}
                  disabled={disabled}
                  onCheckedChange={() => onToggle(o.lmsId)}
                  className="size-5"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">
                      {o.code ?? o.shortname}
                    </span>
                    {o.inProgress && (
                      <span className="text-xs text-success">Current</span>
                    )}
                  </span>
                  <span className="line-clamp-1 text-sm text-muted-foreground">
                    {o.title}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-xs",
                    o.status === "enrolled" || o.status === "available"
                      ? "bg-success/10 text-success"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {PLAN_LABEL[o.status]}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          className="min-h-11"
          disabled={count === 0 || step.starting}
          onClick={onStart}
        >
          {step.starting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Capture {count} course{count === 1 ? "" : "s"}
        </Button>
        <Button variant="ghost" className="min-h-11" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function courseDone(c: CaptureSyncCourse) {
  return c.captured + c.skipped + c.failed;
}

function RunProgress({
  sync,
  stopping,
  onStop,
}: {
  sync: Sync;
  stopping: boolean;
  onStop: () => void;
}) {
  const capturing = sync.courses.filter((c) => c.status === "capture");
  const total = capturing.reduce((n, c) => n + c.total, 0);
  const done = capturing.reduce((n, c) => n + courseDone(c), 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 font-medium">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            <span className="truncate">
              {sync.currentItem ? `Reading ${sync.currentItem}` : "Starting…"}
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {total ? `${done} of ${total}` : "Counting lessons…"}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-secondary"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Overall progress"
        >
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <CourseList courses={sync.courses} live />
      <Button
        variant="outline"
        className="min-h-11"
        disabled={stopping}
        onClick={onStop}
      >
        {stopping ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Square className="mr-2 size-4" />
        )}
        Stop
      </Button>
    </div>
  );
}

function LastRun({ sync }: { sync: Sync }) {
  const captured = sync.courses.reduce((n, c) => n + c.captured, 0);
  const failed = sync.courses.reduce((n, c) => n + c.failed, 0);
  const when = ago(sync.finishedAt ?? sync.updatedAt);
  const line =
    sync.status === "needs_login"
      ? `Couldn't sync ${when}: you weren't logged in to the LMS. Log in, then press Sync now.`
      : sync.status === "stopped"
        ? `Stopped ${when}. ${captured} new lesson${captured === 1 ? "" : "s"} captured before that.`
        : sync.status === "failed"
          ? `The last sync hit a problem ${when}${sync.error ? `: ${sync.error}` : "."}`
          : sync.status === "running"
            ? "A sync was running but the extension stopped reporting. Press Sync now to carry on."
            : `Last synced ${when}: ${captured} new lesson${captured === 1 ? "" : "s"}${failed ? `, ${failed} to retry next time` : ""}.`;
  return (
    <div className="space-y-3">
      <p
        className={cn(
          "flex items-start gap-2 text-sm",
          sync.status === "done" ? "" : "text-amber-700 dark:text-amber-400",
        )}
      >
        {sync.status === "done" ? (
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
        ) : (
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        )}
        {line}
      </p>
      {sync.status === "done" && sync.error && (
        // e.g. course files on Google Drive the browser couldn't open yet
        <p className="rounded-lg bg-secondary px-3.5 py-3 text-sm text-muted-foreground">
          {sync.error}
        </p>
      )}
      {sync.courses.length > 0 && <CourseList courses={sync.courses} />}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="size-3.5" aria-hidden /> Askly checks for new lessons
        once a day while Chrome is open.
      </p>
    </div>
  );
}

function CourseList({
  courses,
  live = false,
}: {
  courses: CaptureSyncCourse[];
  live?: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...courses].sort(
        (a, b) =>
          Number(a.status === "waiting") - Number(b.status === "waiting") ||
          a.code.localeCompare(b.code),
      ),
    [courses],
  );
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {sorted.map((c) => {
        const done = courseDone(c);
        const pct = c.total ? Math.round((done / c.total) * 100) : 0;
        return (
          <li
            key={c.lmsId}
            className="space-y-1.5 rounded-lg border px-3.5 py-2.5 text-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{c.code}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {c.status === "waiting"
                  ? "Waiting for Askly to add it"
                  : c.done
                    ? `${c.captured} new${c.skipped ? ` · ${c.skipped} already had` : ""}${c.failed ? ` · ${c.failed} to retry` : ""}`
                    : c.total
                      ? `${done} of ${c.total}`
                      : live
                        ? "Queued"
                        : "Not started"}
              </span>
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {c.title}
            </p>
            {c.status === "capture" && (
              <div
                className="h-1.5 overflow-hidden rounded-full bg-secondary"
                aria-hidden
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    c.done ? "bg-success" : "bg-foreground",
                  )}
                  style={{ width: `${c.done ? 100 : pct}%` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
