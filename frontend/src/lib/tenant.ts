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
