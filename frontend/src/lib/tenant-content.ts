import "server-only";
import { pgDb } from "lib/db/pg/db.pg";
import { CourseSchema, DepartmentSchema } from "lib/db/pg/schema.pg";
import {
  type AnyColumn,
  type SQL,
  and,
  eq,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getAdminScope } from "lib/tenant";

/**
 * Tenant scoping for university-authored content that may also be
 * platform-wide (announcements, calendar events, report configs).
 *
 * Rows carry a nullable universityId:
 * - set  → belongs to that university (only its admins may manage it)
 * - NULL → platform-wide (only super_admin may create/manage it; every
 *          tenant's users may read it)
 */

export type ContentTenant =
  | { superAdmin: true; universityId: null }
  | { superAdmin: false; universityId: string };

/**
 * The admin's content scope, derived from the SESSION user. Returns null
 * for a tenant admin without a university — callers must treat that as
 * forbidden, never as "skip the filter".
 */
export async function resolveContentTenant(
  adminUserId: string,
): Promise<ContentTenant | null> {
  const scope = await getAdminScope(adminUserId);
  if (scope.superAdmin) return { superAdmin: true, universityId: null };
  if (!scope.university) return null;
  return { superAdmin: false, universityId: scope.university.id };
}

/**
 * Admin management filter: university admins see/manage only their own
 * rows; super_admin is unscoped. Returns undefined for super_admin.
 */
export function manageableBy(
  universityColumn: AnyColumn,
  tenant: ContentTenant,
): SQL | undefined {
  return tenant.superAdmin
    ? undefined
    : eq(universityColumn, tenant.universityId);
}

/**
 * Viewer read filter: rows of the viewer's university plus platform-wide
 * (NULL) rows. A viewer without a university only sees platform-wide rows.
 */
export function visibleToUniversity(
  universityColumn: AnyColumn,
  universityId: string | null | undefined,
): SQL {
  return universityId
    ? (or(eq(universityColumn, universityId), isNull(universityColumn)) ??
        sql`false`)
    : isNull(universityColumn);
}

/**
 * Resolve which universityId a create/update should carry, and validate
 * that any course/department reference lives in that same university.
 * - university admin → always their own university (body ignored)
 * - super_admin      → `requestedUniversityId` (may be null = platform-wide)
 * Returns `{ error }` when a reference crosses tenants.
 */
export async function resolveContentTarget(
  tenant: ContentTenant,
  refs: {
    requestedUniversityId?: string | null;
    courseId?: string | null;
    departmentId?: string | null;
  },
): Promise<{ universityId: string | null } | { error: string }> {
  const universityId = tenant.superAdmin
    ? (refs.requestedUniversityId ?? null)
    : tenant.universityId;

  if ((refs.courseId || refs.departmentId) && !universityId) {
    return {
      error: "Course- or department-specific items must belong to a university",
    };
  }

  if (refs.courseId && universityId) {
    const [course] = await pgDb
      .select({ id: CourseSchema.id })
      .from(CourseSchema)
      .where(
        and(
          eq(CourseSchema.id, refs.courseId),
          eq(CourseSchema.universityId, universityId),
        ),
      )
      .limit(1);
    if (!course) return { error: "Course not found" };
  }

  if (refs.departmentId && universityId) {
    const [department] = await pgDb
      .select({ id: DepartmentSchema.id })
      .from(DepartmentSchema)
      .where(
        and(
          eq(DepartmentSchema.id, refs.departmentId),
          eq(DepartmentSchema.universityId, universityId),
        ),
      )
      .limit(1);
    if (!department) return { error: "Department not found" };
  }

  return { universityId };
}

/**
 * Scope for aggregate/stats queries: the admin's universityId, or "all"
 * for super_admin. null = tenant admin without a university (forbidden).
 */
export async function resolveStatsScope(
  adminUserId: string,
): Promise<string | "all" | null> {
  const tenant = await resolveContentTenant(adminUserId);
  if (!tenant) return null;
  return tenant.superAdmin ? "all" : tenant.universityId;
}
