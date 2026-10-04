import "server-only";

import { decidePaidAccess } from "@/lib/billing/rules";
import {
  getAccessGrantingSubscription,
  getBillingUser,
  getUniversityCoverageFor,
} from "@/lib/billing/status";

/**
 * API paywall. Call right after the session check in any route that spends
 * AI money or serves paid content:
 *
 *   const access = await checkPaidAccess(session.user.id);
 *   if (!access.allowed) return paymentRequiredResponse(access.reason);
 *
 * Same rule as the page paywall (decidePaidAccess): non-students exempt,
 * then trial → own subscription → university seat. Cheap checks first; the
 * subscription/seat queries only run for students past their trial.
 */
export async function checkPaidAccess(
  userId: string,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const now = new Date();
  const user = await getBillingUser(userId);

  const base = {
    userExists: !!user,
    role: user?.role,
    trialEndsAt: user?.trialEndsAt,
    now,
  };

  const quick = decidePaidAccess({
    ...base,
    hasActiveSubscription: false,
    coveredByUniversity: false,
  });
  if (quick.allowed) return { allowed: true };
  if (!user || quick.code === "no_user") {
    return { allowed: false, reason: quick.reason };
  }

  const sub = await getAccessGrantingSubscription(userId);
  const coverage = sub ? null : await getUniversityCoverageFor(user);

  const decision = decidePaidAccess({
    ...base,
    hasActiveSubscription: !!sub,
    coveredByUniversity: !!coverage,
  });
  return decision.allowed
    ? { allowed: true }
    : { allowed: false, reason: decision.reason };
}

/** HTTP 402 for API callers (never a redirect). Clients route to /billing. */
export function paymentRequiredResponse(reason: string): Response {
  return Response.json(
    { error: reason, code: "PAYMENT_REQUIRED" },
    { status: 402 },
  );
}
