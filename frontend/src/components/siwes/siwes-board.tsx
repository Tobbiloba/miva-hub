"use client";

import { EmptyState } from "@/components/layouts/empty-state";
import { PageHeader } from "@/components/layouts/page-header";
import {
  LOG_DAYS,
  dayLabel,
  monthLabel,
  weekEndingOf,
} from "lib/siwes/calendar";
import { cn } from "lib/utils";
import {
  AlertCircle,
  FileUp,
  Loader2,
  NotebookPen,
  Pencil,
  Plus,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { Badge } from "ui/badge";
import { Button } from "ui/button";
import { Input } from "ui/input";
import { Label } from "ui/label";
import { Textarea } from "ui/textarea";

export type PlacementDTO = {
  id: string;
  phase: "I" | "II";
  organization: string;
  address: string | null;
  organizationSize: "large" | "medium" | "small" | null;
  productsJobs: string[];
  structureDescription: string | null;
  departmentSection: string | null;
  industrySupervisorName: string | null;
  industrySupervisorEmail: string | null;
  schoolSupervisor: string | null;
  startDate: string;
  endDate: string;
};

type Entry = {
  id: string;
  entryDate: string;
  present: boolean;
  absenceReason: string | null;
  rawNote: string;
  formattedEntry: string;
  skills: string[];
};

type LogBook = {
  placement: PlacementDTO;
  weeks: {
    weekEnding: string;
    month: string;
    days: { date: string; entry: Entry | null }[];
    generalDescription: string | null;
    departmentSection: string | null;
    projectJob: string | null;
  }[];
  months: { month: string; summary: string | null }[];
  attendance: {
    month: string;
    present: number;
    absent: number;
    reasons: string[];
  }[];
  loggedDays: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't load your log book");
  return res.json();
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function shortDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function SiwesBoard({
  initialPlacements,
  today,
}: {
  initialPlacements: PlacementDTO[];
  today: string;
}) {
  const {
    data: placements = [],
    error,
    mutate,
  } = useSWR(
    "/api/student/siwes/placements",
    (url: string) =>
      fetchJson<{ placements: PlacementDTO[] }>(url).then((d) => d.placements),
    { fallbackData: initialPlacements },
  );
  const [phase, setPhase] = useState<"I" | "II">(
    // The placement running today, else the latest one
    placements.find((p) => p.startDate <= today && today <= p.endDate)?.phase ??
      placements.at(-1)?.phase ??
      "I",
  );
  const [editing, setEditing] = useState<"I" | "II" | null>(null);
  const placement = placements.find((p) => p.phase === phase) ?? null;
  const missingPhase =
    placements.length === 1 ? (placements[0].phase === "I" ? "II" : "I") : null;

  const header = (
    <PageHeader
      title="SIWES Log Book"
      description="Jot down what you did each day (here or just tell Askly in chat). Askly writes it up as your log book's weekly pages; supervisor comments and signatures stay for your supervisor."
      actions={
        placements.length > 0 && (
          <div
            role="radiogroup"
            aria-label="SIWES phase"
            className="flex rounded-full border p-1"
          >
            {(["I", "II"] as const).map((p) => {
              const exists = placements.some((x) => x.phase === p);
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={phase === p}
                  onClick={() => {
                    setPhase(p);
                    if (!exists) setEditing(p);
                  }}
                  className={cn(
                    "min-h-11 rounded-full px-4 text-sm font-medium",
                    phase === p
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  SIWES {p}
                  {!exists && " +"}
                </button>
              );
            })}
          </div>
        )
      }
    />
  );

  if (error) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        {header}
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
        >
          <AlertCircle className="size-4 text-destructive" />
          Couldn&apos;t load your log book.
          <Button
            variant="outline"
            size="sm"
            className="ml-auto min-h-11"
            onClick={() => mutate()}
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  const saved = (p: PlacementDTO) => {
    mutate();
    setPhase(p.phase);
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {header}

      {placements.length === 0 && editing === null ? (
        <EmptyState
          icon={<NotebookPen />}
          title="Set up your placement"
          action={
            <Button className="min-h-11" onClick={() => setEditing("I")}>
              <Plus className="mr-2 size-4" /> Add my placement
            </Button>
          }
        >
          Add where you&apos;re doing SIWES and the dates (or upload your placement
          letter), then log your days.
        </EmptyState>
      ) : editing ? (
        <PlacementForm
          phase={editing}
          initial={placements.find((p) => p.phase === editing) ?? null}
          onSaved={saved}
          onCancel={() => {
            setEditing(null);
            if (!placements.some((p) => p.phase === editing) && placements[0]) {
              setPhase(placements[0].phase);
            }
          }}
        />
      ) : placement ? (
        <>
          <PlacementCard
            placement={placement}
            onEdit={() => setEditing(placement.phase)}
          />
          <LogBookView placement={placement} today={today} />
          {missingPhase && (
            <p className="text-center text-sm text-muted-foreground">
              Doing SIWES {missingPhase} too?{" "}
              <button
                type="button"
                className="inline-flex min-h-11 items-center underline underline-offset-4"
                onClick={() => {
                  setPhase(missingPhase);
                  setEditing(missingPhase);
                }}
              >
                Add that placement
              </button>
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}

function PlacementCard({
  placement,
  onEdit,
}: {
  placement: PlacementDTO;
  onEdit: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            SIWES {placement.phase}
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            {placement.organization}
          </h2>
          <p className="text-sm text-muted-foreground">
            {shortDate(placement.startDate)} – {shortDate(placement.endDate)}
            {placement.departmentSection && ` · ${placement.departmentSection}`}
          </p>
          {placement.address && (
            <p className="mt-1 text-sm text-muted-foreground">
              {placement.address}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 shrink-0"
          onClick={onEdit}
        >
          <Pencil className="mr-2 size-4" /> Edit
        </Button>
      </div>
    </section>
  );
}

function PlacementForm({
  phase,
  initial,
  onSaved,
  onCancel,
}: {
  phase: "I" | "II";
  initial: PlacementDTO | null;
  onSaved: (p: PlacementDTO) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    organization: initial?.organization ?? "",
    address: initial?.address ?? "",
    departmentSection: initial?.departmentSection ?? "",
    industrySupervisorName: initial?.industrySupervisorName ?? "",
    industrySupervisorEmail: initial?.industrySupervisorEmail ?? "",
    schoolSupervisor: initial?.schoolSupervisor ?? "",
    organizationSize: initial?.organizationSize ?? "",
    productsJobs: (initial?.productsJobs ?? []).join("\n"),
    structureDescription: initial?.structureDescription ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [fromLetter, setFromLetter] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function readLetter(file: File) {
    setReading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/student/siwes/letter", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't read the letter");
      const r = data.reading;
      setForm((f) => ({
        ...f,
        organization: r.organization || f.organization,
        address: r.address || f.address,
        startDate: r.startDate || f.startDate,
        endDate: r.endDate || f.endDate,
      }));
      setFromLetter(true);
      toast.success("Filled in from your letter. Check the details.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't read the letter",
      );
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const { placement } = await send(
        "/api/student/siwes/placements",
        "POST",
        {
          phase,
          ...form,
          organizationSize: form.organizationSize || null,
          productsJobs: form.productsJobs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
      );
      toast.success(`SIWES ${phase} placement saved`);
      onSaved(placement);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {initial ? "Edit" : "Add"} your SIWES {phase} placement
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && readLetter(e.target.files[0])}
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={reading}
          onClick={() => fileRef.current?.click()}
        >
          {reading ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 size-4" />
          )}
          Fill from my placement letter
        </Button>
      </div>
      {fromLetter && (
        <p className="rounded-lg bg-secondary px-3 py-2 text-sm">
          Details read from your letter. Check them before saving; the letter
          itself isn&apos;t stored.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Organisation *" className="sm:col-span-2">
          <Input
            className="min-h-11"
            required
            value={form.organization}
            onChange={(e) => set("organization")(e.target.value)}
          />
        </Field>
        <Field label="Full address" className="sm:col-span-2">
          <Input
            className="min-h-11"
            value={form.address}
            onChange={(e) => set("address")(e.target.value)}
          />
        </Field>
        <Field label="Start date *">
          <Input
            className="min-h-11"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => set("startDate")(e.target.value)}
          />
        </Field>
        <Field label="End date *">
          <Input
            className="min-h-11"
            type="date"
            required
            value={form.endDate}
            onChange={(e) => set("endDate")(e.target.value)}
          />
        </Field>
        <Field label="Department / section">
          <Input
            className="min-h-11"
            value={form.departmentSection}
            onChange={(e) => set("departmentSection")(e.target.value)}
          />
        </Field>
        <Field label="Size of organisation">
          <div
            role="radiogroup"
            aria-label="Size of organisation"
            className="flex gap-2"
          >
            {(["large", "medium", "small"] as const).map((size) => (
              <button
                key={size}
                type="button"
                role="radio"
                aria-checked={form.organizationSize === size}
                onClick={() =>
                  set("organizationSize")(
                    form.organizationSize === size ? "" : size,
                  )
                }
                className={cn(
                  "min-h-11 flex-1 rounded-lg border text-sm capitalize",
                  form.organizationSize === size
                    ? "border-foreground bg-accent font-medium"
                    : "text-muted-foreground",
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Industry supervisor">
          <Input
            className="min-h-11"
            value={form.industrySupervisorName}
            onChange={(e) => set("industrySupervisorName")(e.target.value)}
          />
        </Field>
        <Field label="Supervisor's email">
          <Input
            className="min-h-11"
            type="email"
            value={form.industrySupervisorEmail}
            onChange={(e) => set("industrySupervisorEmail")(e.target.value)}
          />
        </Field>
        <Field label="University-based supervisor">
          <Input
            className="min-h-11"
            value={form.schoolSupervisor}
            onChange={(e) => set("schoolSupervisor")(e.target.value)}
          />
        </Field>
        <Field
          label="Products / jobs undertaken (one per line, up to 6)"
          className="sm:col-span-2"
        >
          <Textarea
            rows={3}
            value={form.productsJobs}
            onChange={(e) => set("productsJobs")(e.target.value)}
          />
        </Field>
        <Field
          label="How the organisation is structured"
          className="sm:col-span-2"
        >
          <Textarea
            rows={3}
            placeholder="e.g. MD → Head of IT → network team (where you are), help desk"
            value={form.structureDescription}
            onChange={(e) => set("structureDescription")(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" className="min-h-11" disabled={saving}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          Save placement
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function LogBookView({
  placement,
  today,
}: {
  placement: PlacementDTO;
  today: string;
}) {
  const url = `/api/student/siwes/placements/${placement.id}`;
  const { data, error, isLoading, mutate } = useSWR(url, (u: string) =>
    fetchJson<LogBook>(u),
  );
  const defaultDay =
    today < placement.startDate
      ? placement.startDate
      : today > placement.endDate
        ? placement.endDate
        : today;

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm"
      >
        <AlertCircle className="size-4 text-destructive" />
        Couldn&apos;t load the log book.
        <Button
          variant="outline"
          size="sm"
          className="ml-auto min-h-11"
          onClick={() => mutate()}
        >
          Try again
        </Button>
      </div>
    );
  }
  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-label="Loading"
        />
      </div>
    );
  }

  const months = data.months.map((m) => ({
    ...m,
    weeks: data.weeks.filter((w) => w.month === m.month),
    attendance: data.attendance.find((a) => a.month === m.month),
  }));

  return (
    <div className="space-y-6">
      <LogDayForm
        placement={placement}
        defaultDay={defaultDay}
        today={today}
        onLogged={() => mutate()}
      />
      {data.loggedDays === 0 && (
        <EmptyState icon={<NotebookPen />} title="No days logged yet">
          Log your first day above, or tell Askly in chat: &ldquo;log today: I set up
          the office printers&rdquo;.
        </EmptyState>
      )}
      {months.map((m) => (
        <section key={m.month} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{monthLabel(m.month)}</h3>
            {m.attendance && (
              <p className="text-sm text-muted-foreground">
                {m.attendance.present} days present · {m.attendance.absent}{" "}
                absent
                {m.attendance.reasons.length > 0 &&
                  ` (${m.attendance.reasons.join(", ")})`}
              </p>
            )}
          </div>
          {m.weeks.map((w) => (
            <WeekCard
              key={w.weekEnding}
              placementId={placement.id}
              week={w}
              onChange={() => mutate()}
            />
          ))}
          <MonthSummary
            placementId={placement.id}
            month={m.month}
            summary={m.summary}
            onChange={() => mutate()}
          />
        </section>
      ))}
    </div>
  );
}

function LogDayForm({
  placement,
  defaultDay,
  today,
  onLogged,
}: {
  placement: PlacementDTO;
  defaultDay: string;
  today: string;
  onLogged: () => void;
}) {
  const [date, setDate] = useState(defaultDay);
  const [present, setPresent] = useState(true);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const sunday = date !== "" && weekEndingOf(date) === null;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await send("/api/student/siwes/entries", "POST", {
        date,
        phase: placement.phase,
        note: present ? note : null,
        present,
        absenceReason: present ? null : reason,
      });
      toast.success(`Logged ${dayLabel(date)}`);
      setNote("");
      setReason("");
      onLogged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="siwes-day">Day</Label>
          <Input
            id="siwes-day"
            type="date"
            className="min-h-11"
            min={placement.startDate}
            max={placement.endDate < today ? placement.endDate : today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div
          role="radiogroup"
          aria-label="Attendance"
          className="flex rounded-lg border p-1"
        >
          {[
            [true, "At work"],
            [false, "Absent"],
          ].map(([value, label]) => (
            <button
              key={String(label)}
              type="button"
              role="radio"
              aria-checked={present === value}
              onClick={() => setPresent(value as boolean)}
              className={cn(
                "min-h-11 rounded-md px-3 text-sm",
                present === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground",
              )}
            >
              {label as string}
            </button>
          ))}
        </div>
      </div>
      {sunday && (
        <p className="text-sm text-destructive">
          The log book has rows for Monday to Saturday only.
        </p>
      )}
      {present ? (
        <Textarea
          aria-label="What you did"
          rows={3}
          placeholder="What did you do? Write it however you like, e.g. 'set up 3 workstations, crimped cat6 cables for accounts'"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      ) : (
        <Input
          aria-label="Reason for absence"
          className="min-h-11"
          placeholder="Reason, e.g. sick, public holiday"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      )}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="min-h-11"
          disabled={saving || sunday || (present && !note.trim())}
        >
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {present ? "Log this day" : "Record absence"}
        </Button>
      </div>
    </form>
  );
}

function WeekCard({
  placementId,
  week,
  onChange,
}: {
  placementId: string;
  week: LogBook["weeks"][number];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    departmentSection: week.departmentSection ?? "",
    projectJob: week.projectJob ?? "",
    generalDescription: week.generalDescription ?? "",
  });
  const [saving, setSaving] = useState(false);
  const logged = week.days.filter((d) => d.entry).length;

  async function save() {
    setSaving(true);
    try {
      await send(
        `/api/student/siwes/placements/${placementId}/weeks/${week.weekEnding}`,
        "PUT",
        fields,
      );
      setEditing(false);
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-2xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <h4 className="font-medium">
          Week ending {shortDate(week.weekEnding)}
        </h4>
        <span className="text-xs text-muted-foreground">
          {logged}/6 days logged
        </span>
      </header>
      <dl className="divide-y">
        {week.days.map((d, i) => (
          <div
            key={d.date}
            className="grid gap-1 px-5 py-3 sm:grid-cols-[120px_1fr]"
          >
            <dt className="text-sm font-medium">
              {LOG_DAYS[i]}
              <span className="block text-xs font-normal text-muted-foreground">
                {shortDate(d.date)}
              </span>
            </dt>
            <dd className="text-sm">
              {!d.entry ? (
                <span className="text-muted-foreground">—</span>
              ) : !d.entry.present ? (
                <Badge variant="secondary">
                  Absent
                  {d.entry.absenceReason ? `: ${d.entry.absenceReason}` : ""}
                </Badge>
              ) : (
                <>
                  {d.entry.formattedEntry || d.entry.rawNote}
                  {d.entry.skills.length > 0 && (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {d.entry.skills.map((s) => (
                        <Badge
                          key={s}
                          variant="outline"
                          className="font-normal"
                        >
                          {s}
                        </Badge>
                      ))}
                    </span>
                  )}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 border-t px-5 py-4 text-sm">
        {editing ? (
          <>
            <Field label="Dept / Section">
              <Input
                className="min-h-11"
                value={fields.departmentSection}
                onChange={(e) =>
                  setFields((f) => ({
                    ...f,
                    departmentSection: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Project / job for the week">
              <Input
                className="min-h-11"
                value={fields.projectJob}
                onChange={(e) =>
                  setFields((f) => ({ ...f, projectJob: e.target.value }))
                }
              />
            </Field>
            <Field label="General description of work during the week">
              <Textarea
                rows={3}
                value={fields.generalDescription}
                onChange={(e) =>
                  setFields((f) => ({
                    ...f,
                    generalDescription: e.target.value,
                  }))
                }
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                className="min-h-11"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
              <Button className="min-h-11" disabled={saving} onClick={save}>
                Save week
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 text-muted-foreground">
              <p>
                <span className="text-foreground">Dept/Section:</span>{" "}
                {week.departmentSection || "—"}
              </p>
              <p>
                <span className="text-foreground">Project/Job:</span>{" "}
                {week.projectJob || "—"}
              </p>
              <p>
                <span className="text-foreground">General description:</span>{" "}
                {week.generalDescription || "—"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-2 size-4" /> Edit week
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function MonthSummary({
  placementId,
  month,
  summary,
  onChange,
}: {
  placementId: string;
  month: string;
  summary: string | null;
  onChange: () => void;
}) {
  const [value, setValue] = useState(summary ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = useMemo(
    () => value.trim() !== (summary ?? "").trim(),
    [value, summary],
  );

  async function save() {
    setSaving(true);
    try {
      await send(
        `/api/student/siwes/placements/${placementId}/months/${month}`,
        "PUT",
        { summary: value },
      );
      toast.success("Monthly summary saved");
      onChange();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-dashed p-5">
      <Label htmlFor={`summary-${month}`}>
        Monthly summary of activities · {monthLabel(month)}
      </Label>
      <Textarea
        id={`summary-${month}`}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex justify-end">
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!dirty || saving}
          onClick={save}
        >
          Save summary
        </Button>
      </div>
    </div>
  );
}
