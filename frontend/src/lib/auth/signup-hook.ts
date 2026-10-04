import "server-only";
import { APIError } from "better-auth/api";
import { resolveUniversityFromEmail } from "lib/tenant";
import { getSignupAssignment } from "./signup-context";
import {
  type SignupSource,
  decideSignupAssignment,
  needsDomainResolution,
} from "./signup-policy";

/**
 * better-auth `databaseHooks.user.create.before`: the single tenant gate for
 * every user row better-auth creates. Unknown email domains are rejected;
 * tenant, role and student trial are assigned in the same INSERT.
 */
export async function enforceSignupPolicy(
  user: { email: string },
  context?: { request?: Request },
) {
  const assignment = getSignupAssignment();
  const source: SignupSource = assignment
    ? "provisioned"
    : context?.request
      ? "external"
      : "server";

  const resolvedUniversityId = needsDomainResolution(source, assignment)
    ? ((await resolveUniversityFromEmail(user.email))?.id ?? null)
    : undefined;

  const decision = decideSignupAssignment({
    source,
    assignment,
    resolvedUniversityId,
    now: new Date(),
  });

  if (decision.kind === "reject") {
    throw new APIError("FORBIDDEN", {
      message: decision.message,
      code: decision.code,
    });
  }
  if (decision.kind === "passthrough") return;
  return { data: decision.data };
}
