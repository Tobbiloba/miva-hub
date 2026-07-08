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

/**
 * May this admin act on an entity owned by `entityUniversityId`?
 * Tenant admins only within their own university; super admins
 * (no university on their user row) may act on anything.
 */
export async function isSameTenant(
  adminUserId: string,
  entityUniversityId: string | null | undefined,
): Promise<boolean> {
  const university = await getUserUniversity(adminUserId);
  if (!university) return true;
  return entityUniversityId === university.id;
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
