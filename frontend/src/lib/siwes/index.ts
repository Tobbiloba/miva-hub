import "server-only";

import { and, asc, eq, gte, lte } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  type SiwesLogEntryEntity,
  SiwesLogEntrySchema,
  SiwesMonthSchema,
  type SiwesPlacementEntity,
  SiwesPlacementSchema,
  SiwesWeekSchema,
} from "lib/db/pg/schema.pg";
import { STUDENT_TIMEZONE } from "lib/deadlines/time";
import {
  attendanceByMonth,
  daysOfWeek,
  isLogDay,
  monthOfWeek,
  parseDay,
  placementWeeks,
  weekEndingOf,
} from "./calendar";
import { formatLogEntry } from "./format";

/**
 * SIWES log book data. Every function takes the signed-in student's id
 * first and only ever reads or writes that student's rows; a row that
 * isn't theirs is reported as not found.
 */

export class SiwesError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409,
  ) {
    super(message);
  }
}

export type SiwesPhase = "I" | "II";

/** Today's date in the students' time zone, "YYYY-MM-DD" */
export function studentToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type PlacementInput = {
  phase: SiwesPhase;
  organization: string;
  address?: string | null;
  organizationSize?: "large" | "medium" | "small" | null;
  productsJobs?: string[];
  structureDescription?: string | null;
  departmentSection?: string | null;
  industrySupervisorName?: string | null;
  industrySupervisorEmail?: string | null;
  schoolSupervisor?: string | null;
  startDate: string;
  endDate: string;
};

function checkDates(startDate: string, endDate: string) {
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (!start || !end) throw new SiwesError("Dates must be YYYY-MM-DD", 400);
  if (end < start) {
    throw new SiwesError("The end date is before the start date", 400);
  }
  // SIWES placements run months, not years
  if (end.getTime() - start.getTime() > 400 * 86_400_000) {
    throw new SiwesError("A placement can't be longer than a year", 400);
  }
}

const clean = (value: string | null | undefined) => {
  const v = value?.trim();
  return v ? v : null;
};

export async function listPlacements(
  userId: string,
): Promise<SiwesPlacementEntity[]> {
  return pgDb
    .select()
    .from(SiwesPlacementSchema)
    .where(eq(SiwesPlacementSchema.userId, userId))
    .orderBy(asc(SiwesPlacementSchema.phase));
}

async function getOwnPlacement(
  userId: string,
  placementId: string,
): Promise<SiwesPlacementEntity> {
  const [placement] = await pgDb
    .select()
    .from(SiwesPlacementSchema)
    .where(
      and(
        eq(SiwesPlacementSchema.id, placementId),
        eq(SiwesPlacementSchema.userId, userId),
      ),
    )
    .limit(1);
  if (!placement) throw new SiwesError("Placement not found", 404);
  return placement;
}

/** Create the student's placement for a phase, or update it */
export async function savePlacement(
  userId: string,
  universityId: string | null,
  input: PlacementInput,
): Promise<SiwesPlacementEntity> {
  checkDates(input.startDate, input.endDate);
  const organization = input.organization.trim();
  if (!organization) throw new SiwesError("Add the organisation's name", 400);
  const values = {
    phase: input.phase,
    organization,
    address: clean(input.address),
    organizationSize: input.organizationSize ?? null,
    productsJobs: (input.productsJobs ?? [])
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, 6),
    structureDescription: clean(input.structureDescription),
    departmentSection: clean(input.departmentSection),
    industrySupervisorName: clean(input.industrySupervisorName),
    industrySupervisorEmail: clean(input.industrySupervisorEmail),
    schoolSupervisor: clean(input.schoolSupervisor),
    startDate: input.startDate,
    endDate: input.endDate,
    updatedAt: new Date(),
  };
  const [row] = await pgDb
    .insert(SiwesPlacementSchema)
    .values({ ...values, userId, universityId })
    .onConflictDoUpdate({
      target: [SiwesPlacementSchema.userId, SiwesPlacementSchema.phase],
      set: values,
    })
    .returning();
  return row;
}

/** The placement a day belongs to: the given phase, else the one whose dates cover it */
async function placementForDay(
  userId: string,
  day: string,
  phase?: SiwesPhase,
): Promise<SiwesPlacementEntity> {
  const placements = await listPlacements(userId);
  if (placements.length === 0) {
    throw new SiwesError(
      "No SIWES placement yet. Add your placement first (organisation and dates).",
      404,
    );
  }
  const candidates = phase
    ? placements.filter((p) => p.phase === phase)
    : placements.filter((p) => p.startDate <= day && day <= p.endDate);
  if (candidates.length === 0) {
    throw new SiwesError(
      phase
        ? `No SIWES ${phase} placement yet`
        : `${day} isn't inside any of your placements (${placements.map((p) => `SIWES ${p.phase}: ${p.startDate} to ${p.endDate}`).join("; ")})`,
      phase ? 404 : 400,
    );
  }
  const placement = candidates[0];
  if (day < placement.startDate || day > placement.endDate) {
    throw new SiwesError(
      `${day} is outside your SIWES ${placement.phase} placement (${placement.startDate} to ${placement.endDate})`,
      400,
    );
  }
  return placement;
}

export type LogDayInput = {
  date: string;
  phase?: SiwesPhase;
  /** What they did; added to anything already logged for the day */
  note?: string | null;
  present?: boolean;
  absenceReason?: string | null;
  /** Replace the day's note instead of adding to it */
  replace?: boolean;
};

/**
 * Log a working day: what the student did (Askly drafts the log-book
 * wording and skills) and whether they were present.
 */
export async function logDay(
  userId: string,
  input: LogDayInput,
  today = studentToday(),
): Promise<{ entry: SiwesLogEntryEntity; placement: SiwesPlacementEntity }> {
  const day = input.date;
  if (!parseDay(day)) throw new SiwesError("Dates must be YYYY-MM-DD", 400);
  if (!isLogDay(day)) {
    throw new SiwesError(
      "The log book has rows for Monday to Saturday only",
      400,
    );
  }
  if (day > today) {
    throw new SiwesError("You can't log a day that hasn't happened yet", 400);
  }
  const placement = await placementForDay(userId, day, input.phase);

  const [existing] = await pgDb
    .select()
    .from(SiwesLogEntrySchema)
    .where(
      and(
        eq(SiwesLogEntrySchema.placementId, placement.id),
        eq(SiwesLogEntrySchema.entryDate, day),
      ),
    )
    .limit(1);

  const present = input.present ?? existing?.present ?? true;
  const note = input.note?.trim().slice(0, 2000) ?? "";
  const rawNote =
    input.replace || !existing?.rawNote
      ? note
      : note
        ? `${existing.rawNote}\n${note}`
        : existing.rawNote;
  if (!rawNote && present && !existing) {
    throw new SiwesError("Say what you did that day", 400);
  }

  // Re-draft the wording only when the note changed
  let formattedEntry = existing?.formattedEntry ?? "";
  let skills = existing?.skills ?? [];
  if (rawNote && rawNote !== existing?.rawNote) {
    const formatted = await formatLogEntry({
      note: rawNote,
      organization: placement.organization,
      departmentSection: placement.departmentSection,
    });
    formattedEntry = formatted.entry;
    skills = formatted.skills;
  }
  if (!rawNote) {
    formattedEntry = "";
    skills = [];
  }

  const values = {
    present,
    absenceReason: present
      ? null
      : (clean(input.absenceReason) ?? existing?.absenceReason ?? null),
    rawNote,
    formattedEntry,
    skills,
    updatedAt: new Date(),
  };
  const [entry] = await pgDb
    .insert(SiwesLogEntrySchema)
    .values({ ...values, placementId: placement.id, userId, entryDate: day })
    .onConflictDoUpdate({
      target: [SiwesLogEntrySchema.placementId, SiwesLogEntrySchema.entryDate],
      set: values,
    })
    .returning();
  return { entry, placement };
}

/** The student edits the drafted wording of an entry directly */
export async function editEntryWording(
  userId: string,
  entryId: string,
  formattedEntry: string,
): Promise<SiwesLogEntryEntity> {
  const [entry] = await pgDb
    .update(SiwesLogEntrySchema)
    .set({
      formattedEntry: formattedEntry.trim().slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(SiwesLogEntrySchema.id, entryId),
        eq(SiwesLogEntrySchema.userId, userId),
      ),
    )
    .returning();
  if (!entry) throw new SiwesError("Entry not found", 404);
  return entry;
}

export async function deleteEntry(userId: string, entryId: string) {
  const deleted = await pgDb
    .delete(SiwesLogEntrySchema)
    .where(
      and(
        eq(SiwesLogEntrySchema.id, entryId),
        eq(SiwesLogEntrySchema.userId, userId),
      ),
    )
    .returning({ id: SiwesLogEntrySchema.id });
  if (deleted.length === 0) throw new SiwesError("Entry not found", 404);
}

export type WeekFields = {
  generalDescription?: string | null;
  departmentSection?: string | null;
  projectJob?: string | null;
};

/** Save the student's fields of one weekly page */
export async function saveWeek(
  userId: string,
  placementId: string,
  weekEnding: string,
  fields: WeekFields,
) {
  const placement = await getOwnPlacement(userId, placementId);
  if (
    !placementWeeks(placement.startDate, placement.endDate).includes(weekEnding)
  ) {
    throw new SiwesError("That week isn't part of this placement", 400);
  }
  const values = {
    generalDescription: clean(fields.generalDescription),
    departmentSection: clean(fields.departmentSection),
    projectJob: clean(fields.projectJob),
    updatedAt: new Date(),
  };
  const [row] = await pgDb
    .insert(SiwesWeekSchema)
    .values({ ...values, placementId, weekEnding })
    .onConflictDoUpdate({
      target: [SiwesWeekSchema.placementId, SiwesWeekSchema.weekEnding],
      set: values,
    })
    .returning();
  return row;
}

/** Save the student's monthly summary ("YYYY-MM") */
export async function saveMonth(
  userId: string,
  placementId: string,
  month: string,
  summary: string | null,
) {
  const placement = await getOwnPlacement(userId, placementId);
  const months = new Set(
    placementWeeks(placement.startDate, placement.endDate).map(monthOfWeek),
  );
  if (!months.has(month)) {
    throw new SiwesError("That month isn't part of this placement", 400);
  }
  const values = { summary: clean(summary), updatedAt: new Date() };
  const [row] = await pgDb
    .insert(SiwesMonthSchema)
    .values({ ...values, placementId, month })
    .onConflictDoUpdate({
      target: [SiwesMonthSchema.placementId, SiwesMonthSchema.month],
      set: values,
    })
    .returning();
  return row;
}

export type LogBookWeek = {
  weekEnding: string;
  month: string;
  days: { date: string; entry: SiwesLogEntryEntity | null }[];
  generalDescription: string | null;
  departmentSection: string | null;
  projectJob: string | null;
};

export type LogBook = {
  placement: SiwesPlacementEntity;
  weeks: LogBookWeek[];
  months: { month: string; summary: string | null }[];
  attendance: ReturnType<typeof attendanceByMonth>;
  loggedDays: number;
};

/** One placement laid out like the book: weeks of Mon–Sat, months, attendance */
export async function getLogBook(
  userId: string,
  placementId: string,
): Promise<LogBook> {
  const placement = await getOwnPlacement(userId, placementId);
  const [entries, weekRows, monthRows] = await Promise.all([
    pgDb
      .select()
      .from(SiwesLogEntrySchema)
      .where(
        and(
          eq(SiwesLogEntrySchema.placementId, placement.id),
          eq(SiwesLogEntrySchema.userId, userId),
        ),
      )
      .orderBy(asc(SiwesLogEntrySchema.entryDate)),
    pgDb
      .select()
      .from(SiwesWeekSchema)
      .where(eq(SiwesWeekSchema.placementId, placement.id)),
    pgDb
      .select()
      .from(SiwesMonthSchema)
      .where(eq(SiwesMonthSchema.placementId, placement.id)),
  ]);
  const byDate = new Map(entries.map((e) => [e.entryDate, e]));
  const weekByEnding = new Map(weekRows.map((w) => [w.weekEnding, w]));
  const weeks: LogBookWeek[] = placementWeeks(
    placement.startDate,
    placement.endDate,
  ).map((weekEnding) => {
    const w = weekByEnding.get(weekEnding);
    return {
      weekEnding,
      month: monthOfWeek(weekEnding),
      days: daysOfWeek(weekEnding).map((date) => ({
        date,
        entry: byDate.get(date) ?? null,
      })),
      generalDescription: w?.generalDescription ?? null,
      departmentSection: w?.departmentSection ?? null,
      projectJob: w?.projectJob ?? null,
    };
  });
  const monthSummary = new Map(monthRows.map((m) => [m.month, m.summary]));
  const months = [...new Set(weeks.map((w) => w.month))].map((month) => ({
    month,
    summary: monthSummary.get(month) ?? null,
  }));
  return {
    placement,
    weeks,
    months,
    attendance: attendanceByMonth(entries),
    loggedDays: entries.length,
  };
}

/** Entries for a day range, for the chat ("what did I do last Tuesday?") */
export async function findEntries(
  userId: string,
  from: string,
  to: string,
): Promise<(SiwesLogEntryEntity & { weekEnding: string | null })[]> {
  if (!parseDay(from) || !parseDay(to)) {
    throw new SiwesError("Dates must be YYYY-MM-DD", 400);
  }
  const rows = await pgDb
    .select()
    .from(SiwesLogEntrySchema)
    .where(
      and(
        eq(SiwesLogEntrySchema.userId, userId),
        gte(SiwesLogEntrySchema.entryDate, from),
        lte(SiwesLogEntrySchema.entryDate, to),
      ),
    )
    .orderBy(asc(SiwesLogEntrySchema.entryDate))
    .limit(60);
  return rows.map((r) => ({ ...r, weekEnding: weekEndingOf(r.entryDate) }));
}
