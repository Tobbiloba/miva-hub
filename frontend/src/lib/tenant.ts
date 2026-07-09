import "server-only";
import {
  type University,
  pgUniversityRepository,
} from "lib/db/pg/repositories/university-repository.pg";

/**
 * Tenant (university) resolution helpers.
 *
 * Every user except platform super_admins belongs to exactly one
 * university. The universityId lives on the user row and is exposed on
 * the better-auth session, so most callers can read it without a DB hit
 * and only fetch the full University record when they need tenant
 * details (name, domains, branding...).
 */

/** Extract the domain part of an email, lowercased. */
export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email
    .slice(at + 1)
    .toLowerCase()
    .trim();
}

/**
 * Resolve which active university owns an email address based on its
 * domain. Returns undefined when no tenant claims the domain.
 */
export async function resolveUniversityFromEmail(
  email: string,
): Promise<University | undefined> {
  const domain = emailDomain(email);
  if (!domain) return undefined;
  return pgUniversityRepository.findByEmailDomain(domain);
}

/** Load the full University record for a user's universityId. */
export async function getUniversityById(
  universityId: string | null | undefined,
): Promise<University | undefined> {
  if (!universityId) return undefined;
  return pgUniversityRepository.findById(universityId);
}

/** Does an email's domain belong to this university's domain list? */
export function emailMatchesUniversity(
  email: string,
  university: Pick<University, "emailDomains">,
): boolean {
  const domain = emailDomain(email);
  return (
    !!domain && university.emailDomains.some((d) => d.toLowerCase() === domain)
  );
}

/** Role + universityId straight from the user row (one query). */
async function fetchRoleAndUniversity(
  userId: string,
): Promise<{ role: string | null; universityId: string | null } | undefined> {
  const { pgDb } = await import("lib/db/pg/db.pg");
  const { UserSchema } = await import("lib/db/pg/schema.pg");
  const { eq } = await import("drizzle-orm");
  const [row] = await pgDb
    .select({ role: UserSchema.role, universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  return row;
}

/**
 * May this admin act on an entity owned by `entityUniversityId`?
 * Cross-tenant access requires the super_admin ROLE — never inferred
 * from a missing universityId. A tenant admin without a university is
 * misconfigured and gets nothing, not everything.
 */
export async function isSameTenant(
  adminUserId: string,
  entityUniversityId: string | null | undefined,
): Promise<boolean> {
  const row = await fetchRoleAndUniversity(adminUserId);
  if (row?.role === "super_admin") return true;
  return !!row?.universityId && entityUniversityId === row.universityId;
}

export type AdminScope =
  | { superAdmin: true; university: undefined }
  | { superAdmin: false; university: University | undefined };

/**
 * Tenant scope for an admin request. super_admin → unscoped (university
 * undefined by design). Regular admin → their university, or undefined
 * when misconfigured — callers MUST treat that as forbidden, never as
 * "skip the tenant filter".
 */
export async function getAdminScope(userId: string): Promise<AdminScope> {
  const row = await fetchRoleAndUniversity(userId);
  if (row?.role === "super_admin") {
    return { superAdmin: true, university: undefined };
  }
  return {
    superAdmin: false,
    university: await getUniversityById(row?.universityId),
  };
}

/** Load a user's university by joining through the user row (DB-backed,
 * works even when the session payload lacks universityId). */
export async function getUserUniversity(
  userId: string,
): Promise<University | undefined> {
  const { pgDb } = await import("lib/db/pg/db.pg");
  const { UserSchema } = await import("lib/db/pg/schema.pg");
  const { eq } = await import("drizzle-orm");
  const [row] = await pgDb
    .select({ universityId: UserSchema.universityId })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  return getUniversityById(row?.universityId);
}
