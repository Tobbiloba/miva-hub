"use client";

import { cn } from "lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RotateCw,
  Trash2,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "ui/badge";
import { Button } from "ui/button";

type CaptureState = "processing" | "ready" | "no_text" | "in_review" | "failed";

type Capture = {
  key: string;
  title: string;
  contentType: string;
  course: { id: string; code: string; title: string };
  state: CaptureState;
  error: string | null;
  materialId: string | null;
  createdAt: string;
  own: boolean;
};

const INSTALL_URL = process.env.NEXT_PUBLIC_EXTENSION_INSTALL_URL;
const COLLAPSED = 8;

const STATE: Record<
  CaptureState,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  ready: {
    label: "Ready",
    className: "text-green-700 dark:text-green-400",
    Icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    className: "text-muted-foreground",
    Icon: Loader2,
  },
  in_review: {
    label: "In review",
    className: "text-muted-foreground",
    Icon: Clock,
  },
  no_text: {
    label: "No text to read",
    className: "text-amber-700 dark:text-amber-400",
    Icon: AlertCircle,
  },
  failed: {
    label: "Failed",
    className: "text-destructive",
    Icon: AlertCircle,
  },
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load your captures");
  return (await res.json()).captures as Capture[];
};

/**
 * What the student has captured with Askly Capture, and whether Askly can
 * answer from each item yet. Polls while anything is processing.
 */
export function CapturesPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/student/captures",
    fetcher,
    {
      refreshInterval: (latest) =>
        latest?.some((c) => c.state === "processing") ? 4000 : 0,
    },
  );
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function retry(capture: Capture) {
    setBusy(capture.key);
    const res = await fetch(
      `/api/student/captures/${encodeURIComponent(capture.key)}/retry`,
      { method: "POST" },
    );
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Couldn't retry that capture");
      return;
    }
    toast.success("Trying again");
    await mutate(
      (data ?? []).map((c) =>
        c.key === capture.key ? { ...c, state: "processing", error: null } : c,
      ),
      { revalidate: true },
    );
  }

  async function remove(capture: Capture) {
    setBusy(capture.key);
    const res = await fetch(
      `/api/student/captures/${encodeURIComponent(capture.key)}`,
      { method: "DELETE" },
    );
    setBusy(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Couldn't remove that capture");
      return;
    }
    toast.success("Removed. Askly won't use it any more.");
    await mutate(
      (data ?? []).filter((c) => c.key !== capture.key),
      { revalidate: false },
    );
  }

  const captures = data ?? [];
  const count = (s: CaptureState) =>
    captures.filter((c) => c.state === s).length;
  const shown = expanded ? captures : captures.slice(0, COLLAPSED);

  return (
    <section
      aria-labelledby="captures-title"
      className="rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="captures-title" className="text-[15px] font-semibold">
          Your captures
        </h2>
        {captures.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {count("ready")} ready
            {count("processing") > 0 && ` · ${count("processing")} processing`}
            {count("failed") > 0 && ` · ${count("failed")} failed`}
          </p>
        )}
      </div>

      {error ? (
        <div role="alert" className="mt-3 flex items-center gap-3 text-sm">
          <AlertCircle className="size-4 text-destructive" aria-hidden />
          <span className="flex-1">{error.message}</span>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-6" aria-label="Loading">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : captures.length === 0 ? (
        <div className="mt-3 text-sm text-muted-foreground">
          <p>
            Nothing captured yet. Open a lecture video, PDF, assignment or quiz
            on your LMS and press Capture in the Askly Capture extension. Askly
            answers from what you capture.
          </p>
          {INSTALL_URL && (
            <Button asChild size="sm" variant="outline" className="mt-3">
              <a href={INSTALL_URL} target="_blank" rel="noopener noreferrer">
                Get the extension
              </a>
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-3 divide-y">
            {shown.map((capture) => {
              const { label, className, Icon } = STATE[capture.state];
              const TypeIcon =
                capture.contentType === "video" ? Video : FileText;
              return (
                <li
                  key={capture.key}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <TypeIcon
                    className="mt-0.5 size-7 shrink-0 rounded-lg border bg-secondary p-1.5 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    {capture.materialId && capture.state === "ready" ? (
                      <Link
                        href={`/student/lecture-study/${capture.materialId}`}
                        className="break-words font-medium hover:underline"
                      >
                        {capture.title}
                      </Link>
                    ) : (
                      <p className="break-words font-medium">{capture.title}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="secondary">{capture.course.code}</Badge>
                      <span
                        className={cn("flex items-center gap-1", className)}
                      >
                        <Icon
                          className={cn(
                            "size-3.5",
                            capture.state === "processing" && "animate-spin",
                          )}
                          aria-hidden
                        />
                        {label}
                      </span>
                    </div>
                    {capture.error && capture.state !== "ready" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {capture.error}
                      </p>
                    )}
                  </div>
                  {capture.state === "failed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={`Retry "${capture.title}"`}
                      disabled={busy === capture.key}
                      onClick={() => retry(capture)}
                    >
                      <RotateCw className="size-4" />
                    </Button>
                  )}
                  {capture.own && capture.state !== "processing" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={`Remove "${capture.title}"`}
                      disabled={busy === capture.key}
                      onClick={() => remove(capture)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {captures.length > COLLAPSED && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show fewer" : `Show all ${captures.length}`}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
