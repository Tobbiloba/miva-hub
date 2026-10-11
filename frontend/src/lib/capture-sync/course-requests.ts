import "server-only";

import { pgDb } from "@/lib/db/pg/db.pg";
import {
  CourseRequestSchema,
  CourseSchema,
  DepartmentSchema,
  UniversitySchema,
} from "@/lib/db/pg/schema.pg";
import { and, asc, count, eq, inArray, min, sql } from "drizzle-orm";
import { levelFromCode } from "./course-codes";

/**
 * Courses students' LMS has that their university's Askly catalog doesn't.
 * Admins see their own university's requests (super admins see all), add the
 * course in one step, and the students' next sync captures it.
 */

export type CourseRequestGroup = {
  universityId: string;
  universityName: string;
  courseCode: string;
  courseTitle: string;
  students: number;
  firstRequestedAt: Date;
};

export type DepartmentOption = {
  id: string;
  universityId: string;
  code: string;
  name: string;
};

/** `universityId` null = every university (super admin only). */
export async function listCourseRequests(universityId: string | null): Promise<{
  groups: CourseRequestGroup[];
  departments: DepartmentOption[];
}> {
  const scope = universityId
    ? eq(CourseRequestSchema.universityId, universityId)
    : undefined;
  const groups = await pgDb
    .select({
      universityId: CourseRequestSchema.universityId,
      universityName: UniversitySchema.name,
      courseCode: CourseRequestSchema.courseCode,
      courseTitle: min(CourseRequestSchema.courseTitle),
      students: count(),
      firstRequestedAt: min(CourseRequestSchema.createdAt),
    })
    .from(CourseRequestSchema)
    .innerJoin(
      UniversitySchema,
      eq(UniversitySchema.id, CourseRequestSchema.universityId),
    )
    .where(and(eq(CourseRequestSchema.status, "pending"), scope))
    .groupBy(
      CourseRequestSchema.universityId,
      UniversitySchema.name,
      CourseRequestSchema.courseCode,
    )
    .orderBy(sql`count(*) desc`, asc(CourseRequestSchema.courseCode));

  const universityIds = [...new Set(groups.map((g) => g.universityId))];
  const departments = universityIds.length
    ? await pgDb
        .select({
          id: DepartmentSchema.id,
          universityId: DepartmentSchema.universityId,
          code: DepartmentSchema.code,
          name: DepartmentSchema.name,
        })
        .from(DepartmentSchema)
        .where(inArray(DepartmentSchema.universityId, universityIds))
        .orderBy(asc(DepartmentSchema.name))
    : [];

  return {
    groups: groups.map((g) => ({
      ...g,
      courseTitle: g.courseTitle ?? g.courseCode,
      firstRequestedAt: g.firstRequestedAt ?? new Date(),
    })),
    departments,
  };
}

export class CourseRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * Add a requested course to the university's catalog (or link the course if
 * an admin already created it) and resolve every student's request for it.
 * `universityId` must come from the admin's scope, never the request body.
 */
export async function addRequestedCourse(input: {
  universityId: string;
  courseCode: string;
  title: string;
  departmentId: string;
}): Promise<{ courseId: string; created: boolean; students: number }> {
  const code = input.courseCode.toUpperCase();
  return pgDb.transaction(async (tx) => {
    const [department] = await tx
      .select({ id: DepartmentSchema.id })
      .from(DepartmentSchema)
      .where(
        and(
          eq(DepartmentSchema.id, input.departmentId),
          eq(DepartmentSchema.universityId, input.universityId),
        ),
      )
      .limit(1);
    if (!department) {
      throw new CourseRequestError("Pick a department of this university", 400);
    }

    const [existing] = await tx
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.universityId, input.universityId),
          sql`upper(${CourseSchema.courseCode}) = ${code}`,
        ),
      )
      .limit(1);
    const courseId =
      existing?.id ??
      (
        await tx
          .insert(CourseSchema)
          .values({
            universityId: input.universityId,
            courseCode: code,
            title: input.title.trim().slice(0, 200) || code,
            departmentId: department.id,
            level: levelFromCode(code),
          })
          .returning({ id: CourseSchema.id })
      )[0].id;

    const resolved = await tx
      .update(CourseRequestSchema)
      .set({ status: "added", courseId, resolvedAt: new Date() })
      .where(
        and(
          eq(CourseRequestSchema.universityId, input.universityId),
          eq(CourseRequestSchema.courseCode, code),
          eq(CourseRequestSchema.status, "pending"),
        ),
      )
      .returning({ id: CourseRequestSchema.id });

    return { courseId, created: !existing, students: resolved.length };
  });
}

/** Not a real course (or not one Askly should carry): close the requests. */
export async function dismissCourseRequests(
  universityId: string,
  courseCode: string,
): Promise<number> {
  const rows = await pgDb
    .update(CourseRequestSchema)
    .set({ status: "dismissed", resolvedAt: new Date() })
    .where(
      and(
        eq(CourseRequestSchema.universityId, universityId),
        eq(CourseRequestSchema.courseCode, courseCode.toUpperCase()),
        eq(CourseRequestSchema.status, "pending"),
      ),
    )
    .returning({ id: CourseRequestSchema.id });
  return rows.length;
}
