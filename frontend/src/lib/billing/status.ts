import { pgDb } from "@/lib/db/pg/db.pg";
import { UserSchema, UserSubscriptionSchema } from "@/lib/db/pg/schema.pg";
import { eq, and, gte } from "drizzle-orm";

export interface BillingStatus {
  in_trial: boolean;
  trial_ends_at: string | null;
  days_left_in_trial: number;
  subscription: {
    status: string;
    plan: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  } | null;
  paywalled: boolean;
}

/**
 * Compute billing status for a student.
 * This is the single source of truth for paywall decisions.
 */
export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  // Fetch user trial info
  const [user] = await pgDb
    .select({
      trialStartedAt: UserSchema.trialStartedAt,
      trialEndsAt: UserSchema.trialEndsAt,
      role: UserSchema.role,
    })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);

  if (!user) {
    return {
      in_trial: false,
      trial_ends_at: null,
      days_left_in_trial: 0,
      subscription: null,
      paywalled: true,
    };
  }

  // Non-students are never paywalled
  if (user.role !== "student") {
    return {
      in_trial: false,
      trial_ends_at: null,
      days_left_in_trial: 0,
      subscription: null,
      paywalled: false,
    };
  }

  const now = new Date();
  const trialEndsAt = user.trialEndsAt;
  const inTrial = !!trialEndsAt && trialEndsAt > now;
  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Fetch active subscription
  const [sub] = await pgDb
    .select({
      status: UserSubscriptionSchema.status,
      planId: UserSubscriptionSchema.planId,
      currentPeriodEnd: UserSubscriptionSchema.currentPeriodEnd,
      cancelAtPeriodEnd: UserSubscriptionSchema.cancelAtPeriodEnd,
    })
    .from(UserSubscriptionSchema)
    .where(
      and(
        eq(UserSubscriptionSchema.userId, userId),
        gte(UserSubscriptionSchema.currentPeriodEnd, now),
      ),
    )
    .limit(1);

  const hasActiveSub = !!sub && (sub.status === "active" || sub.status === "trialing");

  // Determine plan name from planId
  let planName = "";
  if (sub) {
    const { SubscriptionPlanSchema } = await import("@/lib/db/pg/schema.pg");
    const [plan] = await pgDb
      .select({ name: SubscriptionPlanSchema.name })
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.id, sub.planId))
      .limit(1);
    planName = plan?.name ?? "";
  }

  const paywalled = !inTrial && !hasActiveSub;

  return {
    in_trial: inTrial,
    trial_ends_at: trialEndsAt?.toISOString() ?? null,
    days_left_in_trial: daysLeft,
    subscription: sub
      ? {
          status: sub.status,
          plan: planName,
          current_period_end: sub.currentPeriodEnd.toISOString(),
          cancel_at_period_end: sub.cancelAtPeriodEnd ?? false,
        }
      : null,
    paywalled,
  };
}
