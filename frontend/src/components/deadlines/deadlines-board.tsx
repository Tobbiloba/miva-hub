"use client";

import { cn } from "lib/utils";
import {
  AlertCircle,
  CalendarClock,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Checkbox } from "ui/checkbox";
import { Input } from "ui/input";
import { Label } from "ui/label";

export type DeadlineDTO = {
  key: string;
  kind: "assignment" | "lms" | "personal";
  title: string;
  dueAt: string;
  course: { id: string; code: string; title: string } | null;
  done: boolean;
  notes: string | null;
  href: string | null;
};

type Course = { id: string; courseCode: string; title: string };

const DAY = 24 * 60 * 60 * 1000;
/** Done items and overdue ones stay visible for this long. */
const LOOKBACK_DAYS = 30;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load your deadlines");
  return (await res.json()).deadlines as DeadlineDTO[];
};

function formatDue(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeDue(iso: string, now: number) {
  const diff = new Date(iso).getTime() - now;
  const days = Math.round(diff / DAY);
  if (diff < 0) {
    const ago = Math.max(1, Math.round(-diff / DAY));
    return -diff < DAY
      ? "overdue"
      : `${ago} day${ago === 1 ? "" : "s"} overdue`;
  }
  if (diff < DAY) {
    const hours = Math.max(1, Math.round(diff / (60 * 60 * 1000)));
    return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

const SOURCE_LABEL: Record<DeadlineDTO["kind"], string> = {
  assignment: "Lecturer",
  lms: "From your LMS",
  personal: "Added by you",
};

export function DeadlinesBoard({
  initialDeadlines,
  courses,
}: {
  initialDeadlines: DeadlineDTO[];
  courses: Course[];
}) {
  // Fixed at mount so the SWR key (and grouping) doesn't change every render
  const [now] = useState(() => Date.now());
  const url = `/api/student/deadlines?includeDone=true&from=${encodeURIComponent(
    new Date(now - LOOKBACK_DAYS * DAY).toISOString(),
  )}`;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    fallbackData: initialDeadlines,
  });
  const [adding, setAdding] = useState(false);

  const groups = useMemo(() => {
    const list = data ?? [];
    const open = list.filter((d) => !d.done);
    const due = (d: DeadlineDTO) => new Date(d.dueAt).getTime();
    return [
      {
        id: "overdue",
        title: "Overdue",
        items: open.filter((d) => due(d) < now),
      },
      {
        id: "week",
        title: "This week",
        items: open.filter((d) => due(d) >= now && due(d) < now + 7 * DAY),
      },
      {
        id: "later",
        title: "Later",
        items: open.filter((d) => due(d) >= now + 7 * DAY),
      },
      {
        id: "done",
        title: "Done",
        items: list.filter((d) => d.done).reverse(),
      },
    ].filter((g) => g.items.length > 0);
  }, [data, now]);

  async function tick(item: DeadlineDTO, done: boolean) {
    const optimistic = (data ?? []).map((d) =>
      d.key === item.key ? { ...d, done } : d,
    );
    await mutate(
      async () => {
        const res = await fetch("/api/student/deadlines", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: item.key, done }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Couldn't update that deadline");
        }
        return optimistic;
      },
      { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
    ).catch((e: Error) => toast.error(e.message));
  }

  async function remove(item: DeadlineDTO) {
    const res = await fetch(
      `/api/student/deadlines?key=${encodeURIComponent(item.key)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Couldn't delete that deadline");
      return;
    }
    await mutate(
      (data ?? []).filter((d) => d.key !== item.key),
      {
        revalidate: false,
      },
    );
    toast.success("Deadline deleted");
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Deadlines</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assignments and quizzes you capture from your LMS show up here
            automatically. Add anything else yourself, or just tell Askly in the
            chat.
          </p>
        </div>
        <Button onClick={() => setAdding((v) => !v)} className="min-h-11">
          <Plus className="size-4" />
          Add deadline
        </Button>
      </div>

      {adding && (
        <AddDeadlineForm
          courses={courses}
          onCancel={() => setAdding(false)}
          onAdded={async (deadline) => {
            setAdding(false);
            await mutate(
              [...(data ?? []), deadline].sort(
                (a, b) =>
                  new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
              ),
              { revalidate: false },
            );
            toast.success("Deadline added");
          }}
        />
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/40 p-4 text-sm"
        >
          <AlertCircle className="size-5 text-destructive" aria-hidden />
          <span className="flex-1">{error.message}</span>
          <Button variant="outline" size="sm" onClick={() => mutate()}>
            Try again
          </Button>
        </div>
      ) : isLoading && !data ? (
        <div className="flex justify-center py-12" aria-label="Loading">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <CalendarClock
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 font-medium">No deadlines yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Capture an assignment or quiz page with Askly Capture and its due
            date appears here, or add one yourself.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.id} aria-labelledby={`deadlines-${group.id}`}>
            <h2
              id={`deadlines-${group.id}`}
              className={cn(
                "mb-2 text-sm font-medium text-muted-foreground",
                group.id === "overdue" && "text-destructive",
              )}
            >
              {group.title} ({group.items.length})
            </h2>
            <ul className="divide-y rounded-xl border">
              {group.items.map((item) => (
                <DeadlineRow
                  key={item.key}
                  item={item}
                  now={now}
                  onTick={(done) => tick(item, done)}
                  onDelete={() => remove(item)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function DeadlineRow({
  item,
  now,
  onTick,
  onDelete,
}: {
  item: DeadlineDTO;
  now: number;
  onTick: (done: boolean) => void;
  onDelete: () => void;
}) {
  const overdue = !item.done && new Date(item.dueAt).getTime() < now;
  const tickable = item.kind !== "assignment";
  const checkboxId = `deadline-${item.key}`;
  return (
    <li className="flex items-start gap-3 p-3 sm:p-4">
      {/* 44px hit area around the checkbox */}
      <label
        htmlFor={checkboxId}
        className="-m-3 flex size-11 shrink-0 cursor-pointer items-center justify-center"
        title={
          tickable ? undefined : "Marked done when you submit the assignment"
        }
      >
        <Checkbox
          id={checkboxId}
          checked={item.done}
          disabled={!tickable}
          onCheckedChange={(v) => onTick(v === true)}
          aria-label={`Mark "${item.title}" ${item.done ? "not done" : "done"}`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "break-words font-medium",
            item.done && "text-muted-foreground line-through",
          )}
        >
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {item.course && <Badge variant="secondary">{item.course.code}</Badge>}
          <span className={cn(overdue && "font-medium text-destructive")}>
            {formatDue(item.dueAt)}
            {!item.done && ` · ${relativeDue(item.dueAt, now)}`}
          </span>
          <span>· {SOURCE_LABEL[item.kind]}</span>
        </div>
        {item.notes && (
          <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
        )}
      </div>
      {item.href && (
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Open "${item.title}"`}
        >
          <Link href={item.href}>
            <ExternalLink className="size-4" />
          </Link>
        </Button>
      )}
      {item.kind === "personal" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          aria-label={`Delete "${item.title}"`}
          onClick={onDelete}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </li>
  );
}

function AddDeadlineForm({
  courses,
  onCancel,
  onAdded,
}: {
  courses: Course[];
  onCancel: () => void;
  onAdded: (deadline: DeadlineDTO) => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [courseId, setCourseId] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !due) return;
    setSaving(true);
    try {
      const res = await fetch("/api/student/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          // datetime-local is the student's local time
          dueAt: new Date(due).toISOString(),
          courseId: courseId || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't add that deadline");
      onAdded(body.deadline);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2"
    >
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="deadline-title">What&apos;s due?</Label>
        <Input
          id="deadline-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. COS102 group presentation"
          maxLength={200}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deadline-due">Due</Label>
        <Input
          id="deadline-due"
          type="datetime-local"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deadline-course">Course (optional)</Label>
        <select
          id="deadline-course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="h-9 rounded-md border bg-transparent px-3 text-sm"
        >
          <option value="">No course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode}: {c.title}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          Add
        </Button>
      </div>
    </form>
  );
}
