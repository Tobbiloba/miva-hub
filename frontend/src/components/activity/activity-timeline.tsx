"use client";

import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Loader2,
  MessageCircleQuestion,
} from "lucide-react";
import { useMemo } from "react";
import useSWR from "swr";
import { Button } from "ui/button";

type Event = {
  type: string;
  courseCode: string | null;
  at: string;
  text: string;
};

const ICONS: Record<string, typeof Download> = {
  capture_added: Download,
  quiz_completed: ClipboardCheck,
  deadline_completed: CheckCircle2,
  course_question_asked: MessageCircleQuestion,
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load your activity");
  return (await res.json()) as { events: Event[]; flashcardsReviewed: number };
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/**
 * The student's last 30 days in Askly: what they captured, quizzed, finished
 * and asked. The same history the assistant uses to keep up with them.
 */
export function ActivityTimeline() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/student/activity?days=30",
    fetcher,
  );

  const days = useMemo(() => {
    const groups = new Map<string, Event[]>();
    for (const e of data?.events ?? []) {
      const label = dayLabel(e.at);
      groups.set(label, [...(groups.get(label) ?? []), e]);
    }
    return [...groups.entries()];
  }, [data]);

  return (
    <section
      aria-labelledby="activity-title"
      className="rounded-xl border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="text-lg font-semibold">
          Recent activity
        </h2>
        {!!data?.flashcardsReviewed && (
          <p className="text-sm text-muted-foreground">
            {data.flashcardsReviewed} flashcards reviewed in 30 days
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Askly keeps track of this so it can help you revise what you missed and
        stay on top of what&apos;s due.
      </p>

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
      ) : days.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing yet. Capture a lecture, take a quiz in the chat, or tick off a
          deadline and it shows up here.
        </p>
      ) : (
        <ol className="mt-3 space-y-4">
          {days.map(([label, events]) => (
            <li key={label}>
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </h3>
              <ul className="mt-2 space-y-2">
                {events.map((e, i) => {
                  const Icon = ICONS[e.type] ?? CheckCircle2;
                  return (
                    <li
                      key={`${e.at}-${i}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 break-words">You {e.text}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
