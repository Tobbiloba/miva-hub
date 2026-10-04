import "server-only";
import { pgDb } from "lib/db/pg/db.pg";
import {
  type CourseMaterialEntity,
  CourseInstructorSchema,
  CourseMaterialSchema,
  CourseSchema,
  FacultySchema,
  StudentEnrollmentSchema,
  UserSchema,
} from "lib/db/pg/schema.pg";
import { and, eq, or } from "drizzle-orm";

/**
 * Single access rule for serving course-material files (used by
 * /api/files/[materialId] and the URL-based download/stream/signed-url
 * endpoints, so every file path enforces the same check):
 *
 * - admin        → material's course is in the admin's university
 * - super_admin  → any material
 * - faculty      → instructor of the course (any semester) or the uploader
 * - student      → enrolled in the course; must be published and not
 *                  soft-deleted
 * - private captures (ownerUserId set) → only the owner (plus same-tenant
 *   admins for moderation)
 */
export async function canAccessMaterial(
  userId: string,
  material: Pick<
    CourseMaterialEntity,
    "courseId" | "uploadedById" | "ownerUserId" | "isPublished" | "deletedAt"
  >,
): Promise<boolean> {
  const [user] = await pgDb
    .select({ role: UserSchema.role, universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  if (!user) return false;

  if (user.role === "super_admin") return true;

  const [course] = await pgDb
    .select({ universityId: CourseSchema.universityId })
    .from(CourseSchema)
    .where(eq(CourseSchema.id, material.courseId))
    .limit(1);
  if (!course) return false;

  // Never across tenants, whatever the role
  if (!user.universityId || user.universityId !== course.universityId) {
    return false;
  }

  if (user.role === "admin") return true;

  // Private capture: owner only (admins handled above)
  if (material.ownerUserId) return material.ownerUserId === userId;

  if (user.role === "faculty") {
    if (material.uploadedById === userId) return true;
    const [assignment] = await pgDb
      .select({ id: CourseInstructorSchema.id })
      .from(CourseInstructorSchema)
      .innerJoin(
        FacultySchema,
        eq(CourseInstructorSchema.facultyId, FacultySchema.id),
      )
      .where(
        and(
          eq(CourseInstructorSchema.courseId, material.courseId),
          eq(FacultySchema.userId, userId),
        ),
      )
      .limit(1);
    return !!assignment;
  }

  // Students (and any other role): enrolled + visible material only
  if (material.deletedAt || !material.isPublished) return false;
  const [enrollment] = await pgDb
    .select({ id: StudentEnrollmentSchema.id })
    .from(StudentEnrollmentSchema)
    .where(
      and(
        eq(StudentEnrollmentSchema.courseId, material.courseId),
        eq(StudentEnrollmentSchema.studentId, userId),
      ),
    )
    .limit(1);
  return !!enrollment;
}

/**
 * Stricter rule for processing/pipeline internals (job status, extracted
 * text before publication): the uploader or private-capture owner, a
 * same-tenant admin, a course instructor, or super_admin. Enrolled students
 * do NOT qualify through enrollment alone.
 */
export async function canManageMaterial(
  userId: string,
  material: Pick<
    CourseMaterialEntity,
    "courseId" | "uploadedById" | "ownerUserId" | "isPublished" | "deletedAt"
  >,
): Promise<boolean> {
  if (material.uploadedById === userId || material.ownerUserId === userId) {
    return true;
  }
  const [user] = await pgDb
    .select({ role: UserSchema.role })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  if (
    user?.role !== "admin" &&
    user?.role !== "super_admin" &&
    user?.role !== "faculty"
  ) {
    return false;
  }
  return canAccessMaterial(userId, material);
}

/**
 * Resolve an `s3://<bucket>/<key>` URL to the course_material row that owns
 * it. Uploads store contentUrl as `s3://bucket/key` (content/faculty upload)
 * or the bare key (ingest), so match either form exactly — never a prefix,
 * so a key can't be stretched into another material's object. Returns null
 * when no material owns the object (callers answer 404).
 */
export async function findMaterialByStorageUrl(
  bucket: string,
  key: string,
): Promise<CourseMaterialEntity | null> {
  const candidates = [`s3://${bucket}/${key}`, key];
  const [row] = await pgDb
    .select()
    .from(CourseMaterialSchema)
    .where(
      or(
        ...candidates.map((c) => eq(CourseMaterialSchema.contentUrl, c)),
        ...candidates.map((c) => eq(CourseMaterialSchema.publicUrl, c)),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Parse `s3://<bucket>/<key>`, require the app's own bucket, resolve the
 * owning material and apply canAccessMaterial. Shared by the URL-based file
 * endpoints so none of them can serve an object the caller couldn't reach
 * through /api/files/[materialId].
 */
export async function authorizeStorageUrl(
  userId: string,
  s3Url: string,
  allowedBucket: string,
): Promise<
  | { ok: true; bucket: string; key: string }
  | { ok: false; status: 400 | 404; error: string }
> {
  const urlMatch = s3Url.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!urlMatch) {
    return { ok: false, status: 400, error: "Invalid S3 URL format" };
  }
  const [, bucket, key] = urlMatch;
  // Foreign bucket, unknown object and no-access all look the same (404)
  // so object existence is never leaked.
  if (bucket !== allowedBucket) {
    return { ok: false, status: 404, error: "File not found" };
  }
  const material = await findMaterialByStorageUrl(bucket, key);
  if (!material || !(await canAccessMaterial(userId, material))) {
    return { ok: false, status: 404, error: "File not found" };
  }
  return { ok: true, bucket, key };
}
