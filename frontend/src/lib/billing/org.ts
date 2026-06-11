import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UniversitySubscriptionSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, count, desc, eq, gte } from "drizzle-orm";

/** Per-seat pricing (kobo-free naira amounts, matching subscription_plan). */
export const ORG_PRICE_PER_SEAT_NGN = {
  monthly: 2000,
  yearly: 20000,
} as const;

export type OrgInterval = keyof typeof ORG_PRICE_PER_SEAT_NGN;

export type UniversitySubscription =
  typeof UniversitySubscriptionSchema.$inferSelect;

/**
 * The university's current org subscription, if it covers today.
 * Status must be "active" and the prepaid period must not have lapsed.
 */
export async function getActiveUniversitySubscription(
  universityId: string,
): Promise<UniversitySubscription | undefined> {
  const [sub] = await pgDb
    .select()
    .from(UniversitySubscriptionSchema)
    .where(
      and(
        eq(UniversitySubscriptionSchema.universityId, universityId),
        eq(UniversitySubscriptionSchema.status, "active"),
        gte(UniversitySubscriptionSchema.currentPeriodEnd, new Date()),
      ),
    )
    .orderBy(desc(UniversitySubscriptionSchema.currentPeriodEnd))
    .limit(1);
  return sub;
}

/** Number of student accounts counting against the university's seat limit. */
export async function countStudentSeatsUsed(
  universityId: string,
): Promise<number> {
  const [row] = await pgDb
    .select({ value: count() })
    .from(UserSchema)
    .where(
      and(
        eq(UserSchema.universityId, universityId),
        eq(UserSchema.role, "student"),
      ),
    );
  return row?.value ?? 0;
}
