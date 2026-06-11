import { pgDb } from "@/lib/db/pg/db.pg";
import {
  UniversitySubscriptionSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, count, desc, eq, gte } from "drizzle-orm";

/**
 * Per-seat pricing in kobo, matching the subscription_plan convention
 * (price_ngn columns store kobo and pass straight to Paystack).
 * monthly: ₦2,000/seat — yearly: ₦20,000/seat.
 */
export const ORG_PRICE_PER_SEAT_NGN = {
  monthly: 200000,
  yearly: 2000000,
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

/**
 * Activate (or renew) a pending org subscription after a verified payment.
 * Idempotent: if this reference already activated the row, it's a no-op.
 * Early renewals stack — the new period starts where current coverage ends.
 */
export async function activateUniversitySubscription(opts: {
  subscriptionId: string;
  reference: string;
  amountKobo?: number;
}): Promise<"activated" | "already_active" | "not_found"> {
  const [row] = await pgDb
    .select()
    .from(UniversitySubscriptionSchema)
    .where(eq(UniversitySubscriptionSchema.id, opts.subscriptionId))
    .limit(1);
  if (!row) return "not_found";
  if (row.status === "active" && row.paystackReference === opts.reference) {
    return "already_active";
  }

  const now = new Date();
  const prior = await getActiveUniversitySubscription(row.universityId);
  const base =
    prior && prior.id !== row.id && prior.currentPeriodEnd! > now
      ? prior.currentPeriodEnd!
      : now;
  const days = row.interval === "yearly" ? 365 : 30;
  const end = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

  await pgDb
    .update(UniversitySubscriptionSchema)
    .set({
      status: "active",
      currentPeriodStart: base,
      currentPeriodEnd: end,
      paystackReference: opts.reference,
      amountPaidNgn: opts.amountKobo ?? row.seatLimit * row.pricePerSeatNgn,
      lastPaymentDate: now,
      updatedAt: now,
    })
    .where(eq(UniversitySubscriptionSchema.id, row.id));
  return "activated";
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
