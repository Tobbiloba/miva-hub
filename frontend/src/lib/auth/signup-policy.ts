/**
 * Pure sign-up policy — no DB, no network. Decides which tenant, role and
 * trial a new user row gets. Runs inside better-auth's
 * `databaseHooks.user.create.before`, so EVERY creation path (email sign-up,
 * OAuth, server-side provisioning) goes through the same rules.
 */

const DEFAULT_TRIAL_DAYS = 7;

/** STUDENT_TRIAL_DAYS env value → whole days in 1..365, else the default. */
export function parseTrialDays(raw: string | undefined): number {
  const days = Number(raw);
  return Number.isInteger(days) && days >= 1 && days <= 365
    ? days
    : DEFAULT_TRIAL_DAYS;
}

// Free-trial length for new students. Set STUDENT_TRIAL_DAYS (e.g. 30 for a
// free beta) to override; unset = 7 days.
export const STUDENT_TRIAL_DAYS = parseTrialDays(
  process.env.STUDENT_TRIAL_DAYS,
);

export type SignupRole = "student" | "faculty" | "admin" | "super_admin";

/**
 * Server-side provisioning instructions (see `withSignupAssignment`).
 * - `universityId` omitted → resolve the tenant from the email domain and
 *   reject unknown domains (same gate as public sign-up).
 * - `universityId` given → trusted: the caller already authorized the tenant
 *   (admin of that university, a valid invite, ...). `null` = no tenant
 *   (platform super_admin only).
 */
export interface SignupAssignment {
  universityId?: string | null;
  role?: SignupRole;
  enrollmentStatus?: string;
}

/**
 * - `external`    — HTTP request into better-auth (sign-up, OAuth callback).
 * - `provisioned` — server code called better-auth inside `withSignupAssignment`.
 * - `server`      — server code called `auth.api.*` directly without an
 *   assignment (legacy callers that set role/tenant themselves right after).
 */
export type SignupSource = "external" | "provisioned" | "server";

export interface SignupAssignmentData {
  universityId: string | null;
  role: SignupRole;
  enrollmentStatus: string;
  trialStartedAt?: Date;
  trialEndsAt?: Date;
}

export type SignupDecision =
  | { kind: "reject"; code: "UNKNOWN_EMAIL_DOMAIN"; message: string }
  | { kind: "passthrough" }
  | { kind: "assign"; data: SignupAssignmentData };

export const UNKNOWN_EMAIL_DOMAIN_MESSAGE =
  "Your email domain isn't registered with any university on Askly. Use your school email address, or ask your university to join the platform.";

/** Does this decision need the email-domain → university lookup? */
export function needsDomainResolution(
  source: SignupSource,
  assignment: SignupAssignment | undefined,
): boolean {
  if (source === "external") return true;
  if (source === "provisioned") return assignment?.universityId === undefined;
  return false;
}

export function decideSignupAssignment(input: {
  source: SignupSource;
  assignment?: SignupAssignment;
  /** Active university owning the email's domain, if it was looked up */
  resolvedUniversityId?: string | null;
  now: Date;
}): SignupDecision {
  const { source, assignment, resolvedUniversityId, now } = input;

  if (source === "server") return { kind: "passthrough" };

  // External requests can never choose their tenant or role.
  const explicitTenant =
    source === "provisioned" && assignment?.universityId !== undefined;
  const universityId = explicitTenant
    ? (assignment!.universityId as string | null)
    : (resolvedUniversityId ?? null);

  if (!explicitTenant && !universityId) {
    return {
      kind: "reject",
      code: "UNKNOWN_EMAIL_DOMAIN",
      message: UNKNOWN_EMAIL_DOMAIN_MESSAGE,
    };
  }

  const role: SignupRole =
    source === "provisioned" ? (assignment?.role ?? "student") : "student";
  const enrollmentStatus =
    (source === "provisioned" ? assignment?.enrollmentStatus : undefined) ??
    "active";

  const data: SignupAssignmentData = { universityId, role, enrollmentStatus };
  if (role === "student") {
    data.trialStartedAt = now;
    data.trialEndsAt = new Date(
      now.getTime() + STUDENT_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );
  }
  return { kind: "assign", data };
}
