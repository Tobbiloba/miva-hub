import "server-only";

import { type PlanTier, planTierByName } from "@/lib/billing/plans";
import { type PaidAccessDecision, decidePaidAccess } from "@/lib/billing/rules";
import {
  getAccessGrantingSubscription,
  getBillingUser,
  getUniversityCoverageFor,
} from "@/lib/billing/status";
import { pgDb } from "@/lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "@/lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

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
export async function checkPaidAccess(userId: string): Promise<
  | {
      allowed: true;
      via: Extract<PaidAccessDecision, { allowed: true }>["via"];
    }
  | { allowed: false; reason: string }
> {
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
  if (quick.allowed) return { allowed: true, via: quick.via };
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
    ? { allowed: true, via: decision.via }
    : { allowed: false, reason: decision.reason };
}

/**
 * The tier of the student's own paid subscription, or null without one.
 * Checked before the trial: a student can subscribe (even to Premium)
 * while their trial is still running.
 */
export async function getSubscriptionTier(
  userId: string,
): Promise<PlanTier | null> {
  const sub = await getAccessGrantingSubscription(userId);
  if (!sub) return null;
  const [plan] = await pgDb
    .select({ name: SubscriptionPlanSchema.name })
    .from(SubscriptionPlanSchema)
    .where(eq(SubscriptionPlanSchema.id, sub.planId))
    .limit(1);
  return planTierByName(plan?.name);
}

/**
 * Premium features (SIWES, final-year project, the bigger voice allowance)
 * need an Askly Premium subscription. Staff (non-student roles) are exempt,
 * as they are from the paywall. University seats and the trial cover the
 * standard plan only.
 */
export async function checkPremiumAccess(
  userId: string,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const user = await getBillingUser(userId);
  if (!user) return { allowed: false, reason: "Account not found." };
  if (user.role && user.role !== "student") return { allowed: true };
  if ((await getSubscriptionTier(userId)) === "premium") {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: "This is part of Askly Premium. Upgrade to use it.",
  };
}

/** HTTP 403 for a Premium feature; clients show the upgrade card. */
export function premiumRequiredResponse(reason: string): Response {
  return Response.json(
    { error: reason, code: "PREMIUM_REQUIRED" },
    { status: 403 },
  );
}

/** HTTP 402 for API callers (never a redirect). Clients route to /billing. */
export function paymentRequiredResponse(reason: string): Response {
  return Response.json(
    { error: reason, code: "PAYMENT_REQUIRED" },
    { status: 402 },
  );
}
