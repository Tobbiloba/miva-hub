import "server-only";

import { enrollStudent } from "@/lib/academic/enroll-student";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CaptureSyncSchema,
  CourseMaterialSchema,
  CourseRequestSchema,
  CourseSchema,
  IngestionJobSchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import type { CaptureSyncCourse } from "app-types/capture-sync";
import { and, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { lmsCourseTitle, normaliseLmsCourseCode } from "./course-codes";

/**
 * Automatic capture ("sync"). The extension reads the student's LMS course
 * list and each course's lessons with the student's own LMS session; the
 * server decides which LMS courses map to the student's Askly courses,
 * enrolls them where the course exists, asks admins to add the ones that
 * don't, and keeps the run's progress for the Askly Capture page.
 */

export type LmsCourse = {
  lmsId: number;
  shortname: string;
  fullname: string;
};

export type PlannedCourse = {
  lmsId: number;
  code: string | null;
  title: string;
  /**
   * enrolled: already in the student's Askly courses
   * available: in the catalog; starting a sync enrolls them
   * missing: not in the catalog; starting a sync asks an admin to add it
   * requested: missing and already asked for
   * unrecognised: no course code in the LMS name
   */
  status: "enrolled" | "available" | "missing" | "requested" | "unrecognised";
};

export class SyncError extends Error {
  constructor(
    message: string,
    readonly code: "SCHOOL_PENDING" | "NOT_STUDENT",
    readonly status: number,
  ) {
    super(message);
  }
}

async function studentUniversity(userId: string): Promise<string> {
  const [row] = await pgDb
    .select({ role: UserSchema.role, universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  if (row?.role !== "student") {
    throw new SyncError(
      "Automatic capture is for student accounts.",
      "NOT_STUDENT",
      403,
    );
  }
  if (!row.universityId) {
    throw new SyncError(
      "Capturing works once your school is on Askly. We'll email you when it's added.",
      "SCHOOL_PENDING",
      403,
    );
  }
  return row.universityId;
}

/** Which of these LMS courses Askly can capture for the student (read-only). */
export async function planSync(
  userId: string,
  lmsCourses: LmsCourse[],
): Promise<PlannedCourse[]> {
  const universityId = await studentUniversity(userId);
  const named = lmsCourses.map((c) => {
    const code = normaliseLmsCourseCode(c.shortname, c.fullname);
    return { lmsId: c.lmsId, code, title: lmsCourseTitle(c.fullname, code) };
  });
  const codes = [
    ...new Set(named.map((c) => c.code).filter((c): c is string => !!c)),
  ];
  if (!codes.length) {
    return named.map((c) => ({ ...c, status: "unrecognised" as const }));
  }

  const [catalog, enrolled, requested] = await Promise.all([
    pgDb
      .select({ id: CourseSchema.id, code: CourseSchema.courseCode })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.universityId, universityId),
          eq(CourseSchema.isActive, true),
          inArray(sql`upper(${CourseSchema.courseCode})`, codes),
        ),
      ),
    pgDb
      .select({ courseId: StudentEnrollmentSchema.courseId })
      .from(StudentEnrollmentSchema)
      .where(
        and(
          eq(StudentEnrollmentSchema.studentId, userId),
          eq(StudentEnrollmentSchema.status, "enrolled"),
        ),
      ),
    pgDb
      .select({ code: CourseRequestSchema.courseCode })
      .from(CourseRequestSchema)
      .where(
        and(
          eq(CourseRequestSchema.userId, userId),
          eq(CourseRequestSchema.universityId, universityId),
          // A dismissed request isn't raised again
          ne(CourseRequestSchema.status, "added"),
        ),
      ),
  ]);
  const byCode = new Map(catalog.map((c) => [c.code.toUpperCase(), c.id]));
  const enrolledIds = new Set(enrolled.map((e) => e.courseId));
  const requestedCodes = new Set(requested.map((r) => r.code));

  return named.map((c) => {
    if (!c.code) return { ...c, status: "unrecognised" as const };
    const courseId = byCode.get(c.code);
    if (courseId) {
      return {
        ...c,
        status: enrolledIds.has(courseId)
          ? ("enrolled" as const)
          : ("available" as const),
      };
    }
    return {
      ...c,
      status: requestedCodes.has(c.code)
        ? ("requested" as const)
        : ("missing" as const),
    };
  });
}

export type StartedCourse = {
  lmsId: number;
  code: string;
  title: string;
  status: "capture" | "waiting";
};

/**
 * Start (or restart) the student's sync for the courses they picked: enroll
 * the ones Askly has, ask admins for the rest, reset the progress row.
 * Returns what to capture plus the LMS pages already captured, so the
 * extension skips them without fetching.
 */
export async function startSync(
  userId: string,
  lmsCourses: LmsCourse[],
): Promise<{ courses: StartedCourse[]; capturedSources: string[] }> {
  const universityId = await studentUniversity(userId);
  const plan = await planSync(userId, lmsCourses);

  const courses: StartedCourse[] = [];
  for (const c of plan) {
    if (!c.code || c.status === "unrecognised") continue;
    if (c.status === "available") {
      const [course] = await pgDb
        .select({ id: CourseSchema.id })
        .from(CourseSchema)
        .where(
          and(
            eq(CourseSchema.universityId, universityId),
            sql`upper(${CourseSchema.courseCode}) = ${c.code}`,
          ),
        )
        .limit(1);
      const enrolled = course
        ? await enrollStudent(userId, universityId, course.id)
        : null;
      // No current term → enrollment is closed; capture would be refused
      courses.push({
        lmsId: c.lmsId,
        code: c.code,
        title: c.title,
        status:
          enrolled?.ok || enrolled?.reason === "already_enrolled"
            ? "capture"
            : "waiting",
      });
      continue;
    }
    if (c.status === "missing") {
      await pgDb
        .insert(CourseRequestSchema)
        .values({
          userId,
          universityId,
          courseCode: c.code,
          courseTitle: c.title,
        })
        .onConflictDoNothing();
    }
    courses.push({
      lmsId: c.lmsId,
      code: c.code,
      title: c.title,
      status: c.status === "enrolled" ? "capture" : "waiting",
    });
  }

  const progress: CaptureSyncCourse[] = courses.map((c) => ({
    ...c,
    total: 0,
    captured: 0,
    skipped: 0,
    failed: 0,
    done: c.status === "waiting",
  }));
  const now = new Date();
  await pgDb
    .insert(CaptureSyncSchema)
    .values({ userId, status: "running", courses: progress, startedAt: now })
    .onConflictDoUpdate({
      target: CaptureSyncSchema.userId,
      set: {
        status: "running",
        courses: progress,
        currentItem: null,
        error: null,
        startedAt: now,
        updatedAt: now,
        finishedAt: null,
      },
    });

  return { courses, capturedSources: await capturedSources(userId) };
}

/** LMS page URLs this student already captured (and that didn't fail). */
async function capturedSources(userId: string): Promise<string[]> {
  const [jobs, materials] = await Promise.all([
    pgDb
      .select({ url: IngestionJobSchema.sourceUrl })
      .from(IngestionJobSchema)
      .leftJoin(
        CourseMaterialSchema,
        eq(CourseMaterialSchema.id, IngestionJobSchema.courseMaterialId),
      )
      .where(
        and(
          eq(IngestionJobSchema.volunteerId, userId),
          ne(IngestionJobSchema.status, "failed"),
          or(
            isNull(IngestionJobSchema.courseMaterialId),
            isNull(CourseMaterialSchema.deletedAt),
          ),
        ),
      ),
    pgDb
      .select({
        url: sql<string>`${CourseMaterialSchema.externalMetadata}->>'source_url'`,
      })
      .from(CourseMaterialSchema)
      .where(
        and(
          eq(CourseMaterialSchema.ownerUserId, userId),
          isNull(CourseMaterialSchema.deletedAt),
          sql`${CourseMaterialSchema.externalMetadata}->>'source_url' is not null`,
        ),
      ),
  ]);
  return [...new Set([...jobs, ...materials].map((r) => r.url))];
}

export type SyncPatch = {
  status?: "running" | "done" | "stopped" | "needs_login" | "failed";
  courses?: Array<{
    lmsId: number;
    total: number;
    captured: number;
    skipped: number;
    failed: number;
    done: boolean;
  }>;
  currentItem?: string | null;
  error?: string | null;
};

/**
 * Progress from the extension. Only the counts of courses the run started
 * with can change; the course list itself is fixed by startSync.
 */
export async function updateSync(userId: string, patch: SyncPatch) {
  const [row] = await pgDb
    .select()
    .from(CaptureSyncSchema)
    .where(eq(CaptureSyncSchema.userId, userId))
    .limit(1);

  const now = new Date();
  const finished =
    patch.status && patch.status !== "running" ? { finishedAt: now } : {};
  if (!row) {
    // A sync that can't begin (LMS logged out) still tells the page why
    if (!patch.status || patch.status === "running") return null;
    const [created] = await pgDb
      .insert(CaptureSyncSchema)
      .values({
        userId,
        status: patch.status,
        error: patch.error ?? null,
        ...finished,
      })
      .returning();
    return created;
  }

  const updates = new Map((patch.courses ?? []).map((c) => [c.lmsId, c]));
  const courses = row.courses.map((c) => {
    const u = updates.get(c.lmsId);
    return u && c.status === "capture"
      ? {
          ...c,
          total: u.total,
          captured: u.captured,
          skipped: u.skipped,
          failed: u.failed,
          done: u.done,
        }
      : c;
  });
  const [updated] = await pgDb
    .update(CaptureSyncSchema)
    .set({
      courses,
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.currentItem !== undefined
        ? { currentItem: patch.currentItem }
        : {}),
      ...(patch.error !== undefined ? { error: patch.error } : {}),
      updatedAt: now,
      ...finished,
    })
    .where(eq(CaptureSyncSchema.id, row.id))
    .returning();
  return updated;
}

export async function getSync(userId: string) {
  const [row] = await pgDb
    .select()
    .from(CaptureSyncSchema)
    .where(eq(CaptureSyncSchema.userId, userId))
    .limit(1);
  return row ?? null;
}

/** A run counts as live while the extension keeps reporting. */
const LIVE_RUN_MS = 15 * 60 * 1000;

/** Is this student mid-sync? (Sync captures get a larger allowance.) */
export async function hasLiveSync(userId: string): Promise<boolean> {
  const row = await getSync(userId);
  return (
    row?.status === "running" &&
    Date.now() - row.updatedAt.getTime() < LIVE_RUN_MS
  );
}
