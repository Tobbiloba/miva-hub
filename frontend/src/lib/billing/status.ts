import {
  getUniversitySeatCoverage,
  isStudentWithinSeatLimit,
} from "@/lib/billing/org";
import {
  RENEWAL_GRACE_MS,
  decidePaidAccess,
  subscriptionGrantsAccess,
} from "@/lib/billing/rules";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  SubscriptionPlanSchema,
  UserSchema,
  UserSubscriptionSchema,
} from "@/lib/db/pg/schema.pg";
import { and, desc, eq, gte } from "drizzle-orm";

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
  /** True when the student holds a seat on an active university subscription. */
  covered_by_university: boolean;
  paywalled: boolean;
}

export type BillingUser = {
  id: string;
  role: string | null;
  universityId: string | null;
  trialEndsAt: Date | null;
  enrollmentStatus: string | null;
  createdAt: Date;
};

export async function getBillingUser(
  userId: string,
): Promise<BillingUser | undefined> {
  const [user] = await pgDb
    .select({
      id: UserSchema.id,
      role: UserSchema.role,
      universityId: UserSchema.universityId,
      trialEndsAt: UserSchema.trialEndsAt,
      enrollmentStatus: UserSchema.enrollmentStatus,
      createdAt: UserSchema.createdAt,
    })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  return user;
}

/**
 * The user's subscription that currently grants access, if any. Several
 * rows can exist for one user (history, or legacy duplicates); the one
 * with the latest period end wins, deterministically.
 */
export async function getAccessGrantingSubscription(userId: string) {
  const now = new Date();
  const rows = await pgDb
    .select({
      id: UserSubscriptionSchema.id,
      status: UserSubscriptionSchema.status,
      planId: UserSubscriptionSchema.planId,
      currentPeriodEnd: UserSubscriptionSchema.currentPeriodEnd,
      cancelAtPeriodEnd: UserSubscriptionSchema.cancelAtPeriodEnd,
    })
    .from(UserSubscriptionSchema)
    .where(
      and(
        eq(UserSubscriptionSchema.userId, userId),
        gte(
          UserSubscriptionSchema.currentPeriodEnd,
          new Date(now.getTime() - RENEWAL_GRACE_MS),
        ),
      ),
    )
    .orderBy(
      desc(UserSubscriptionSchema.currentPeriodEnd),
      desc(UserSubscriptionSchema.createdAt),
    );
  return rows.find((r) => subscriptionGrantsAccess(r, now));
}

/** Seat-limited university coverage for a student (null if not covered). */
export async function getUniversityCoverageFor(
  user: BillingUser,
): Promise<{ currentPeriodEnd: Date } | null> {
  if (!user.universityId) return null;
  const coverage = await getUniversitySeatCoverage(user.universityId);
  if (!coverage) return null;
  const withinLimit = await isStudentWithinSeatLimit(
    user,
    user.universityId,
    coverage.seatLimit,
  );
  return withinLimit ? { currentPeriodEnd: coverage.currentPeriodEnd } : null;
}

/**
 * Compute billing status for a student (UI view of the paywall).
 * The allow/deny itself comes from decidePaidAccess — the same rule
 * checkPaidAccess (API paywall) uses — so pages and APIs can't disagree.
 */
export async function getBillingStatus(userId: string): Promise<BillingStatus> {
  const now = new Date();
  const user = await getBillingUser(userId);

  const empty: BillingStatus = {
    in_trial: false,
    trial_ends_at: null,
    days_left_in_trial: 0,
    subscription: null,
    covered_by_university: false,
    paywalled: true,
  };

  if (!user) return empty;

  // Non-students are never paywalled
  if (user.role && user.role !== "student") {
    return { ...empty, paywalled: false };
  }

  const [sub, universityCoverage] = await Promise.all([
    getAccessGrantingSubscription(userId),
    getUniversityCoverageFor(user),
  ]);

  const decision = decidePaidAccess({
    userExists: true,
    role: user.role,
    trialEndsAt: user.trialEndsAt,
    hasActiveSubscription: !!sub,
    coveredByUniversity: !!universityCoverage,
    now,
  });

  const trialEndsAt = user.trialEndsAt;
  const inTrial = !!trialEndsAt && trialEndsAt > now;
  const daysLeft = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // A student's own subscription is shown over university coverage: it's
  // what they pay for and can cancel.
  if (!sub && universityCoverage) {
    return {
      in_trial: false,
      trial_ends_at: null,
      days_left_in_trial: 0,
      subscription: {
        status: "active",
        plan: "university",
        current_period_end: universityCoverage.currentPeriodEnd.toISOString(),
        cancel_at_period_end: false,
      },
      covered_by_university: true,
      paywalled: !decision.allowed,
    };
  }

  let planName = "";
  if (sub) {
    const [plan] = await pgDb
      .select({ name: SubscriptionPlanSchema.name })
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.id, sub.planId))
      .limit(1);
    planName = plan?.name ?? "";
  }

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
    covered_by_university: !!universityCoverage,
    paywalled: !decision.allowed,
  };
}
