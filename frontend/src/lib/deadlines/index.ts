import "server-only";

import {
  type SQL,
  and,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import {
  getEnrolledCourse,
  groundableMaterialFilter,
} from "lib/ai/course-tutor-context";
import { pgDb } from "lib/db/pg/db.pg";
import {
  AssignmentSchema,
  AssignmentSubmissionSchema,
  CourseMaterialSchema,
  CourseSchema,
  StudentDeadlineSchema,
  StudentEnrollmentSchema,
} from "lib/db/pg/schema.pg";
import { recordActivity } from "lib/progress/record-activity";

/**
 * One deadline list per student, merged from three sources:
 * - "assignment": a lecturer's published assignment in an enrolled course
 *   (done once submitted),
 * - "lms": a captured LMS assignment/quiz page with a due date that the
 *   student can see (done when they tick it),
 * - "personal": a deadline the student added themselves.
 *
 * Every query is scoped to the student's own enrollments/rows; the student id
 * always comes from the session.
 */

export type DeadlineKind = "assignment" | "lms" | "personal";

export type Deadline = {
  /** "<kind>:<id>" — stable id across sources, used to tick/delete */
  key: string;
  kind: DeadlineKind;
  title: string;
  dueAt: Date;
  course: { id: string; code: string; title: string } | null;
  done: boolean;
  notes: string | null;
  /** Where to open it, if anywhere */
  href: string | null;
};

export type DeadlineQuery = {
  from?: Date;
  to?: Date;
  includeDone?: boolean;
  courseId?: string;
};

const LMS_DEADLINE_TYPES = ["assignment_external", "quiz"] as const;

function rangeFilter(column: any, from?: Date, to?: Date): SQL[] {
  const parts: SQL[] = [];
  if (from) parts.push(gte(column, from));
  if (to) parts.push(lte(column, to));
  return parts;
}

export async function listDeadlines(
  studentId: string,
  query: DeadlineQuery = {},
): Promise<Deadline[]> {
  const { from, to, includeDone = false, courseId } = query;
  // EXISTS, not a join: a student can hold more than one "enrolled" row for a
  // course (e.g. a carryover in a later term), which a join would duplicate
  const enrolledIn = (courseColumn: typeof CourseSchema.id) =>
    exists(
      pgDb
        .select({ one: sql`1` })
        .from(StudentEnrollmentSchema)
        .where(
          and(
            eq(StudentEnrollmentSchema.courseId, courseColumn),
            eq(StudentEnrollmentSchema.studentId, studentId),
            eq(StudentEnrollmentSchema.status, "enrolled"),
          ),
        ),
    );
  const course = {
    id: CourseSchema.id,
    code: CourseSchema.courseCode,
    title: CourseSchema.title,
  };

  const [assignments, lms, personal] = await Promise.all([
    pgDb
      .select({
        id: AssignmentSchema.id,
        title: AssignmentSchema.title,
        dueAt: AssignmentSchema.dueDate,
        course,
        submissionId: AssignmentSubmissionSchema.id,
      })
      .from(AssignmentSchema)
      .innerJoin(CourseSchema, eq(CourseSchema.id, AssignmentSchema.courseId))
      .leftJoin(
        AssignmentSubmissionSchema,
        and(
          eq(AssignmentSubmissionSchema.assignmentId, AssignmentSchema.id),
          eq(AssignmentSubmissionSchema.studentId, studentId),
        ),
      )
      .where(
        and(
          enrolledIn(CourseSchema.id),
          courseId ? eq(CourseSchema.id, courseId) : undefined,
          eq(AssignmentSchema.isPublished, true),
          ...rangeFilter(AssignmentSchema.dueDate, from, to),
          includeDone ? undefined : isNull(AssignmentSubmissionSchema.id),
        ),
      ),
    pgDb
      .select({
        id: CourseMaterialSchema.id,
        title: CourseMaterialSchema.title,
        dueAt: CourseMaterialSchema.dueAt,
        course,
        completedAt: StudentDeadlineSchema.completedAt,
      })
      .from(CourseMaterialSchema)
      .innerJoin(
        CourseSchema,
        eq(CourseSchema.id, CourseMaterialSchema.courseId),
      )
      .leftJoin(
        StudentDeadlineSchema,
        and(
          eq(StudentDeadlineSchema.materialId, CourseMaterialSchema.id),
          eq(StudentDeadlineSchema.studentId, studentId),
        ),
      )
      .where(
        and(
          enrolledIn(CourseSchema.id),
          courseId ? eq(CourseSchema.id, courseId) : undefined,
          groundableMaterialFilter(studentId),
          inArray(CourseMaterialSchema.materialType, [...LMS_DEADLINE_TYPES]),
          isNotNull(CourseMaterialSchema.dueAt),
          ...rangeFilter(CourseMaterialSchema.dueAt, from, to),
          includeDone ? undefined : isNull(StudentDeadlineSchema.completedAt),
        ),
      ),
    pgDb
      .select({
        id: StudentDeadlineSchema.id,
        title: StudentDeadlineSchema.title,
        dueAt: StudentDeadlineSchema.dueAt,
        notes: StudentDeadlineSchema.notes,
        completedAt: StudentDeadlineSchema.completedAt,
        courseId: CourseSchema.id,
        courseCode: CourseSchema.courseCode,
        courseTitle: CourseSchema.title,
      })
      .from(StudentDeadlineSchema)
      .leftJoin(
        CourseSchema,
        eq(CourseSchema.id, StudentDeadlineSchema.courseId),
      )
      .where(
        and(
          eq(StudentDeadlineSchema.studentId, studentId),
          eq(StudentDeadlineSchema.source, "manual"),
          courseId ? eq(StudentDeadlineSchema.courseId, courseId) : undefined,
          ...rangeFilter(StudentDeadlineSchema.dueAt, from, to),
          includeDone ? undefined : isNull(StudentDeadlineSchema.completedAt),
        ),
      ),
  ]);

  const all: Deadline[] = [
    ...assignments.map((a) => ({
      key: `assignment:${a.id}`,
      kind: "assignment" as const,
      title: a.title,
      dueAt: a.dueAt,
      course: a.course,
      done: a.submissionId !== null,
      notes: null,
      href: `/student/assignments/${a.id}`,
    })),
    ...lms.map((m) => ({
      key: `lms:${m.id}`,
      kind: "lms" as const,
      title: m.title,
      dueAt: m.dueAt!,
      course: m.course,
      done: m.completedAt !== null,
      notes: null,
      href: `/student/lecture-study/${m.id}`,
    })),
    ...personal.map((p) => ({
      key: `personal:${p.id}`,
      kind: "personal" as const,
      title: p.title,
      dueAt: p.dueAt,
      course: p.courseId
        ? { id: p.courseId, code: p.courseCode!, title: p.courseTitle! }
        : null,
      done: p.completedAt !== null,
      notes: p.notes,
      href: null,
    })),
  ];
  return all.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}

export type DeadlineInput = {
  title: string;
  dueAt: Date;
  courseId?: string | null;
  notes?: string | null;
};

export class DeadlineError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404,
  ) {
    super(message);
  }
}

/** Add a personal deadline. A course, if given, must be one they're enrolled in. */
export async function addPersonalDeadline(
  studentId: string,
  input: DeadlineInput,
): Promise<Deadline> {
  let course: Deadline["course"] = null;
  if (input.courseId) {
    const enrolled = await getEnrolledCourse(studentId, input.courseId);
    if (!enrolled)
      throw new DeadlineError("You're not enrolled in that course", 400);
    course = {
      id: enrolled.id,
      code: enrolled.courseCode,
      title: enrolled.title,
    };
  }
  const [row] = await pgDb
    .insert(StudentDeadlineSchema)
    .values({
      studentId,
      courseId: course?.id ?? null,
      title: input.title,
      dueAt: input.dueAt,
      notes: input.notes ?? null,
      source: "manual",
    })
    .returning();
  return {
    key: `personal:${row.id}`,
    kind: "personal",
    title: row.title,
    dueAt: row.dueAt,
    course,
    done: false,
    notes: row.notes,
    href: null,
  };
}

function parseKey(key: string): { kind: DeadlineKind; id: string } {
  const [kind, id] = key.split(":");
  if (
    (kind === "assignment" || kind === "lms" || kind === "personal") &&
    /^[0-9a-f-]{36}$/i.test(id ?? "")
  ) {
    return { kind, id };
  }
  throw new DeadlineError("Unknown deadline", 404);
}

/**
 * Tick a deadline done (or not done). Lecturer assignments are done by
 * submitting them, so they can't be ticked here.
 */
export async function setDeadlineDone(
  studentId: string,
  key: string,
  done: boolean,
): Promise<void> {
  const { kind, id } = parseKey(key);
  const completedAt = done ? new Date() : null;

  if (kind === "assignment") {
    throw new DeadlineError(
      "Lecturer assignments are marked done when you submit them",
      400,
    );
  }

  if (kind === "personal") {
    const updated = await pgDb
      .update(StudentDeadlineSchema)
      .set({ completedAt, updatedAt: new Date() })
      .where(
        and(
          eq(StudentDeadlineSchema.id, id),
          eq(StudentDeadlineSchema.studentId, studentId),
          eq(StudentDeadlineSchema.source, "manual"),
        ),
      )
      .returning({
        id: StudentDeadlineSchema.id,
        title: StudentDeadlineSchema.title,
        courseId: StudentDeadlineSchema.courseId,
        dueAt: StudentDeadlineSchema.dueAt,
      });
    if (updated.length === 0) throw new DeadlineError("Unknown deadline", 404);
    if (done) await rememberCompleted(studentId, key, updated[0]);
    return;
  }

  // lms: the material must be one of this student's visible deadlines
  const [material] = await pgDb
    .select({
      id: CourseMaterialSchema.id,
      title: CourseMaterialSchema.title,
      dueAt: CourseMaterialSchema.dueAt,
      courseId: CourseMaterialSchema.courseId,
    })
    .from(CourseMaterialSchema)
    .innerJoin(
      StudentEnrollmentSchema,
      eq(StudentEnrollmentSchema.courseId, CourseMaterialSchema.courseId),
    )
    .where(
      and(
        eq(CourseMaterialSchema.id, id),
        eq(StudentEnrollmentSchema.studentId, studentId),
        eq(StudentEnrollmentSchema.status, "enrolled"),
        groundableMaterialFilter(studentId),
        isNotNull(CourseMaterialSchema.dueAt),
      ),
    )
    .limit(1);
  if (!material) throw new DeadlineError("Unknown deadline", 404);

  await pgDb
    .insert(StudentDeadlineSchema)
    .values({
      studentId,
      materialId: material.id,
      courseId: material.courseId,
      title: material.title,
      dueAt: material.dueAt!,
      source: "lms_capture",
      completedAt,
    })
    .onConflictDoUpdate({
      target: [
        StudentDeadlineSchema.studentId,
        StudentDeadlineSchema.materialId,
      ],
      set: { completedAt, updatedAt: new Date() },
    });
  if (done) await rememberCompleted(studentId, key, material);
}

/** The assistant remembers finished work, and whether it was on time. */
async function rememberCompleted(
  studentId: string,
  key: string,
  deadline: { title: string; courseId: string | null; dueAt: Date | null },
) {
  await recordActivity({
    studentId,
    activityType: "deadline_completed",
    courseId: deadline.courseId,
    entityMetadata: {
      key,
      title: deadline.title,
      onTime: deadline.dueAt ? deadline.dueAt.getTime() >= Date.now() : null,
    },
  }).catch(() => {});
}

/** Delete a deadline the student added. Captured and lecturer ones can't be. */
export async function deletePersonalDeadline(
  studentId: string,
  key: string,
): Promise<void> {
  const { kind, id } = parseKey(key);
  if (kind !== "personal") {
    throw new DeadlineError("Only deadlines you added can be deleted", 400);
  }
  const deleted = await pgDb
    .delete(StudentDeadlineSchema)
    .where(
      and(
        eq(StudentDeadlineSchema.id, id),
        eq(StudentDeadlineSchema.studentId, studentId),
        eq(StudentDeadlineSchema.source, "manual"),
      ),
    )
    .returning({ id: StudentDeadlineSchema.id });
  if (deleted.length === 0) throw new DeadlineError("Unknown deadline", 404);
}
