import {
  ORG_PRICE_PER_SEAT_KOBO,
  type OrgInterval as PlanOrgInterval,
} from "@/lib/billing/plans";
import {
  addInterval,
  isWithinSeatLimit,
  validateOrgPayment,
} from "@/lib/billing/rules";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  PaymentTransactionSchema,
  UniversitySubscriptionSchema,
  UserSchema,
} from "@/lib/db/pg/schema.pg";
import { and, count, desc, eq, gte, lt, lte, or } from "drizzle-orm";

/**
 * Per-seat pricing in kobo (re-exported from the plans source of truth).
 * price_per_seat_ngn columns store kobo and pass straight to Paystack.
 */
export const ORG_PRICE_PER_SEAT_NGN = ORG_PRICE_PER_SEAT_KOBO;

export type OrgInterval = PlanOrgInterval;

export type UniversitySubscription =
  typeof UniversitySubscriptionSchema.$inferSelect;

/** Rows whose prepaid period covers `now` (started and not yet ended). */
function coveringNow(universityId: string, now: Date) {
  return and(
    eq(UniversitySubscriptionSchema.universityId, universityId),
    eq(UniversitySubscriptionSchema.status, "active"),
    lte(UniversitySubscriptionSchema.currentPeriodStart, now),
    gte(UniversitySubscriptionSchema.currentPeriodEnd, now),
  );
}

/**
 * The university's org subscription covering today, if any (latest-ending
 * first). Stacked renewals whose period hasn't started yet are excluded so
 * their seat limit doesn't apply early.
 */
export async function getActiveUniversitySubscription(
  universityId: string,
): Promise<UniversitySubscription | undefined> {
  const [sub] = await pgDb
    .select()
    .from(UniversitySubscriptionSchema)
    .where(coveringNow(universityId, new Date()))
    .orderBy(desc(UniversitySubscriptionSchema.currentPeriodEnd))
    .limit(1);
  return sub;
}

/**
 * Seats available today: the sum of seat limits across every covering
 * block (each paid or comped block is a separate purchase of seats), with
 * the latest coverage end date. Null when nothing covers today.
 */
export async function getUniversitySeatCoverage(
  universityId: string,
): Promise<{ seatLimit: number; currentPeriodEnd: Date } | null> {
  const rows = await pgDb
    .select({
      seatLimit: UniversitySubscriptionSchema.seatLimit,
      currentPeriodEnd: UniversitySubscriptionSchema.currentPeriodEnd,
    })
    .from(UniversitySubscriptionSchema)
    .where(coveringNow(universityId, new Date()));
  if (rows.length === 0) return null;
  return {
    seatLimit: rows.reduce((sum, r) => sum + r.seatLimit, 0),
    currentPeriodEnd: rows.reduce(
      (max, r) =>
        r.currentPeriodEnd && r.currentPeriodEnd > max
          ? r.currentPeriodEnd
          : max,
      new Date(0),
    ),
  };
}

/** Students who consume seats: role student, active enrollment. */
function seatHolders(universityId: string) {
  return and(
    eq(UserSchema.universityId, universityId),
    eq(UserSchema.role, "student"),
    eq(UserSchema.enrollmentStatus, "active"),
  );
}

/**
 * Is this student inside the university's seat limit? Seats are assigned
 * by signup order (see isWithinSeatLimit in rules.ts for the full rule).
 */
export async function isStudentWithinSeatLimit(
  student: {
    id: string;
    createdAt: Date;
    enrollmentStatus: string | null;
  },
  universityId: string,
  seatLimit: number,
): Promise<boolean> {
  if (student.enrollmentStatus !== "active") return false;
  const [row] = await pgDb
    .select({ value: count() })
    .from(UserSchema)
    .where(
      and(
        seatHolders(universityId),
        or(
          lt(UserSchema.createdAt, student.createdAt),
          and(
            eq(UserSchema.createdAt, student.createdAt),
            lt(UserSchema.id, student.id),
          ),
        ),
      ),
    );
  return isWithinSeatLimit(row?.value ?? 0, seatLimit);
}

export type ActivateOrgResult =
  | "activated"
  | "already_active"
  | "not_found"
  | "wrong_university"
  | "amount_mismatch";

/**
 * Find the pending org subscription a payment belongs to, using only data
 * WE wrote server-side: the reference stamped on the row at checkout, or
 * (rows created before that) the payment_transaction we logged for the
 * reference. Paystack metadata is client-settable and is never trusted.
 */
async function findOrgSubscriptionByReference(
  reference: string,
): Promise<UniversitySubscription | undefined> {
  const [byRef] = await pgDb
    .select()
    .from(UniversitySubscriptionSchema)
    .where(eq(UniversitySubscriptionSchema.paystackReference, reference))
    .limit(1);
  if (byRef) return byRef;

  const [txn] = await pgDb
    .select({ metadata: PaymentTransactionSchema.metadata })
    .from(PaymentTransactionSchema)
    .where(eq(PaymentTransactionSchema.paystackReference, reference))
    .limit(1);
  const subscriptionId =
    txn?.metadata?.type === "university_subscription"
      ? (txn.metadata.subscriptionId as string | undefined)
      : undefined;
  if (!subscriptionId) return undefined;

  const [byTxn] = await pgDb
    .select()
    .from(UniversitySubscriptionSchema)
    .where(eq(UniversitySubscriptionSchema.id, subscriptionId))
    .limit(1);
  return byTxn;
}

/** True when a reference belongs to an org seat purchase we initiated. */
export async function isOrgPaymentReference(
  reference: string,
): Promise<boolean> {
  return !!(await findOrgSubscriptionByReference(reference));
}

/**
 * Activate a pending org subscription after a Paystack-verified payment.
 *
 * - The row is located by OUR reference (never by Paystack metadata).
 * - `expectedUniversityId` (browser callback) must match the row's tenant.
 * - The verified amount must cover seatLimit × pricePerSeat (kobo).
 * - Exactly-once: the pending → active transition is a conditional UPDATE,
 *   so the callback and webhook racing can't both activate or double-stack.
 *   Early renewals stack — the new period starts where coverage ends.
 */
export async function activateUniversitySubscription(opts: {
  reference: string;
  amountKobo: number | null | undefined;
  currency: string | null | undefined;
  expectedUniversityId?: string;
}): Promise<ActivateOrgResult> {
  const row = await findOrgSubscriptionByReference(opts.reference);
  if (!row) return "not_found";
  if (
    opts.expectedUniversityId &&
    row.universityId !== opts.expectedUniversityId
  ) {
    return "wrong_university";
  }
  if (row.status !== "pending") {
    return row.paystackReference === opts.reference
      ? "already_active"
      : "not_found";
  }

  const check = validateOrgPayment({
    amountKobo: opts.amountKobo,
    currency: opts.currency,
    seatLimit: row.seatLimit,
    pricePerSeatKobo: row.pricePerSeatNgn,
  });
  if (!check.ok) {
    console.error(
      `[Org Billing] refusing to activate ${row.id} for ${opts.reference}: ${check.reason}`,
    );
    return "amount_mismatch";
  }

  const now = new Date();
  const prior = await getActiveUniversitySubscription(row.universityId);
  const base =
    prior && prior.id !== row.id && prior.currentPeriodEnd! > now
      ? prior.currentPeriodEnd!
      : now;
  const end = addInterval(base, row.interval);

  const updated = await pgDb
    .update(UniversitySubscriptionSchema)
    .set({
      status: "active",
      currentPeriodStart: base,
      currentPeriodEnd: end,
      paystackReference: opts.reference,
      amountPaidNgn: opts.amountKobo!,
      lastPaymentDate: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(UniversitySubscriptionSchema.id, row.id),
        eq(UniversitySubscriptionSchema.status, "pending"),
      ),
    )
    .returning({ id: UniversitySubscriptionSchema.id });

  return updated.length > 0 ? "activated" : "already_active";
}

/** Number of student accounts counting against the university's seat limit. */
export async function countStudentSeatsUsed(
  universityId: string,
): Promise<number> {
  const [row] = await pgDb
    .select({ value: count() })
    .from(UserSchema)
    .where(seatHolders(universityId));
  return row?.value ?? 0;
}
