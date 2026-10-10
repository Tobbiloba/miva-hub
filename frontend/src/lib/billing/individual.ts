import "server-only";

import { sendPaymentReceiptEmail } from "@/lib/billing/receipt";
import {
  addInterval,
  computeExtendedPeriodEnd,
  isPlaceholderSubscriptionCode,
  normalizeInterval,
  validateIndividualCharge,
} from "@/lib/billing/rules";
import { pgDb } from "@/lib/db/pg/db.pg";
import {
  PaymentTransactionSchema,
  SubscriptionChangeLogSchema,
  SubscriptionPlanSchema,
  UserSchema,
  UserSubscriptionSchema,
} from "@/lib/db/pg/schema.pg";
import { paystackService } from "@/lib/payment/paystack-service";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { INDIVIDUAL_PLANS, planChangeCreditMs } from "./plans";

/**
 * Individual (student) subscription lifecycle, driven by Paystack data.
 * Shared by the webhook and the browser-callback verify route so both
 * paths apply payments identically.
 *
 * Invariants:
 *  - One live user_subscription row per user: every write upserts the
 *    user's existing row (by subscription_code, else their latest row)
 *    under a per-user advisory lock, so charge.success and
 *    subscription.create racing can't create duplicates.
 *  - Paying extends access (computeExtendedPeriodEnd); cancelling never
 *    shortens paid-for access — rows just stop renewing and lapse at
 *    currentPeriodEnd.
 *  - The owner of a charge is taken from OUR payment_transaction row for
 *    the reference; Paystack identity fields are only a fallback for
 *    renewals (which have no row of ours).
 */

type Tx = Parameters<Parameters<typeof pgDb.transaction>[0]>[0];
type PlanRow = typeof SubscriptionPlanSchema.$inferSelect;
type SubscriptionRow = typeof UserSubscriptionSchema.$inferSelect;

/** Subset of Paystack's transaction / charge.success / verify payload. */
export interface PaystackChargeData {
  id?: number | string;
  reference: string;
  status?: string;
  amount?: number;
  currency?: string;
  paid_at?: string | null;
  paidAt?: string | null;
  customer?: { email?: string; customer_code?: string } | null;
  authorization?: { authorization_code?: string } | null;
  plan?: string | { plan_code?: string } | null;
  plan_object?: { plan_code?: string } | null;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string | null;
  } | null;
}

export type ChargeResult =
  | "applied"
  | "ignored_not_success"
  | "ignored_not_individual"
  | "no_owner"
  | "no_plan"
  | "amount_mismatch";

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function planCodeOf(data: PaystackChargeData): string | undefined {
  if (data.plan_object?.plan_code) return data.plan_object.plan_code;
  if (typeof data.plan === "string" && data.plan) return data.plan;
  if (data.plan && typeof data.plan === "object") return data.plan.plan_code;
  return undefined;
}

async function lockUser(tx: Tx, userId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`);
}

/**
 * Only the plans sold today (plans.ts) grant access. Legacy rows (PRO,
 * STUDENT, …) still exist with Paystack plan codes, and a charge on one of
 * them must not turn into an Askly subscription.
 */
const SELLABLE_PLAN_NAMES = Object.values(INDIVIDUAL_PLANS).map((p) => p.name);

async function getPlanByCode(code: string | undefined) {
  if (!code) return undefined;
  const [plan] = await pgDb
    .select()
    .from(SubscriptionPlanSchema)
    .where(
      and(
        eq(SubscriptionPlanSchema.paystackPlanCode, code),
        inArray(SubscriptionPlanSchema.name, SELLABLE_PLAN_NAMES),
      ),
    )
    .limit(1);
  return plan;
}

async function getPlanById(id: string | undefined) {
  if (!id) return undefined;
  const [plan] = await pgDb
    .select()
    .from(SubscriptionPlanSchema)
    .where(
      and(
        eq(SubscriptionPlanSchema.id, id),
        inArray(SubscriptionPlanSchema.name, SELLABLE_PLAN_NAMES),
      ),
    )
    .limit(1);
  return plan;
}

/**
 * Resolve which user a Paystack customer/subscription belongs to, most
 * specific identifier first: subscription code → customer code → email.
 */
export async function findUserForPaystackCustomer(ids: {
  subscriptionCode?: string | null;
  customerCode?: string | null;
  email?: string | null;
}): Promise<string | undefined> {
  if (ids.subscriptionCode) {
    const [sub] = await pgDb
      .select({ userId: UserSubscriptionSchema.userId })
      .from(UserSubscriptionSchema)
      .where(
        eq(
          UserSubscriptionSchema.paystackSubscriptionCode,
          ids.subscriptionCode,
        ),
      )
      .limit(1);
    if (sub) return sub.userId;
  }
  if (ids.customerCode) {
    const [user] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(eq(UserSchema.paystackCustomerCode, ids.customerCode))
      .limit(1);
    if (user) return user.id;
    const [sub] = await pgDb
      .select({ userId: UserSubscriptionSchema.userId })
      .from(UserSubscriptionSchema)
      .where(eq(UserSubscriptionSchema.paystackCustomerCode, ids.customerCode))
      .orderBy(desc(UserSubscriptionSchema.currentPeriodEnd))
      .limit(1);
    if (sub) return sub.userId;
  }
  if (ids.email) {
    const [user] = await pgDb
      .select({ id: UserSchema.id })
      .from(UserSchema)
      .where(sql`lower(${UserSchema.email}) = lower(${ids.email})`)
      .limit(1);
    if (user) return user.id;
  }
  return undefined;
}

/** The row a Paystack event should update: by code, else the user's latest. */
async function findRowToUpsert(
  tx: Tx,
  userId: string,
  subscriptionCode: string | undefined,
): Promise<SubscriptionRow | undefined> {
  if (subscriptionCode) {
    const [byCode] = await tx
      .select()
      .from(UserSubscriptionSchema)
      .where(
        eq(UserSubscriptionSchema.paystackSubscriptionCode, subscriptionCode),
      )
      .limit(1);
    if (byCode) return byCode;
  }
  const [latest] = await tx
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.userId, userId))
    .orderBy(
      desc(UserSubscriptionSchema.currentPeriodEnd),
      desc(UserSubscriptionSchema.createdAt),
    )
    .limit(1);
  return latest;
}

/**
 * Subscription code to store: a real SUB_ code from Paystack always wins
 * (replacing a charge_<ref> placeholder); otherwise keep what the row has;
 * a brand-new row without one gets a placeholder (column is UNIQUE, so
 * never ""). Note the unique constraint: a real code already on another
 * row is found by findRowToUpsert first, so it's never written twice.
 */
function pickSubscriptionCode(
  incoming: string | undefined,
  existing: string | null | undefined,
  reference: string,
): string {
  if (incoming && !isPlaceholderSubscriptionCode(incoming)) return incoming;
  if (existing) return existing;
  return `charge_${reference}`;
}

/** Plan-change credit on a row, in ms (see applyPlanChange) */
function creditOf(row: SubscriptionRow | undefined): number {
  const credit = Number(row?.metadata?.planChangeCreditMs ?? 0);
  return Number.isFinite(credit) && credit > 0 ? credit : 0;
}

/** Where the row's Paystack billing cycle ends, without the credit */
function cycleEndOf(row: SubscriptionRow): Date {
  return (
    row.nextPaymentDate ??
    new Date(row.currentPeriodEnd.getTime() - creditOf(row))
  );
}

async function upsertSubscription(
  tx: Tx,
  opts: {
    userId: string;
    plan: PlanRow;
    reference: string;
    subscriptionCode?: string;
    customerCode?: string;
    authorizationCode?: string;
    emailToken?: string;
    paidAt: Date;
    nextPaymentDate?: Date | null;
    amountKobo?: number;
    nonRenewing?: boolean;
    countsAsPayment: boolean;
    /** The student chose to switch plans in checkout (see applyPlanChange) */
    planChange?: boolean;
  },
): Promise<{ row: SubscriptionRow; created: boolean }> {
  const existing = await findRowToUpsert(
    tx,
    opts.userId,
    opts.subscriptionCode,
  );
  if (opts.planChange && existing && existing.planId !== opts.plan.id) {
    return applyPlanChange(tx, existing, opts);
  }
  // Paystack bills on its own cycle; a plan-change credit sits on top of it
  // (access = cycle end + credit), so renewals keep the credit and repeated
  // events for one payment still converge on the same dates.
  const creditMs = creditOf(existing);
  const cycleEnd = computeExtendedPeriodEnd({
    currentPeriodEnd: existing ? cycleEndOf(existing) : undefined,
    paidAt: opts.paidAt,
    interval: normalizeInterval(opts.plan.interval),
    nextPaymentDate: opts.nextPaymentDate,
  });
  const periodEnd = new Date(cycleEnd.getTime() + creditMs);
  const extended =
    !existing || periodEnd.getTime() !== existing.currentPeriodEnd.getTime();
  const now = new Date();

  // A cancellation sticks unless this event proves billing resumed after
  // it: a different real Paystack subscription, or a payment/creation
  // dated after the cancel. Stops a late redelivery of an old event from
  // silently un-cancelling a subscription the student cancelled.
  const isDifferentPaystackSub =
    !!opts.subscriptionCode &&
    !isPlaceholderSubscriptionCode(opts.subscriptionCode) &&
    !!existing?.paystackSubscriptionCode &&
    !isPlaceholderSubscriptionCode(existing.paystackSubscriptionCode) &&
    existing.paystackSubscriptionCode !== opts.subscriptionCode;
  const stillCancelled =
    !!existing?.cancelAtPeriodEnd &&
    !isDifferentPaystackSub &&
    !(existing.cancelledAt && opts.paidAt > existing.cancelledAt);
  const cancelAtPeriodEnd = !!opts.nonRenewing || stillCancelled;

  // A second live Paystack subscription for the same student (two paid
  // checkouts) must not overwrite the first one's code — that orphaned it,
  // leaving a subscription nobody could cancel. Keep the first, flag it;
  // cancel disables every live subscription of the customer.
  const existingStillLive =
    !!existing &&
    existing.status === "active" &&
    !existing.cancelAtPeriodEnd &&
    existing.currentPeriodEnd > now;
  if (isDifferentPaystackSub && existingStillLive) {
    console.error(
      `[billing] user ${opts.userId} has a second live Paystack subscription ${opts.subscriptionCode} (keeping ${existing?.paystackSubscriptionCode})`,
    );
  }

  // ...and must not switch the student's plan either (a late renewal of a
  // subscription they replaced in a plan change would flip them back)
  const strayOtherSub = isDifferentPaystackSub && existingStillLive;

  const values = {
    planId: strayOtherSub ? existing!.planId : opts.plan.id,
    paystackSubscriptionCode:
      isDifferentPaystackSub && existingStillLive
        ? existing!.paystackSubscriptionCode
        : pickSubscriptionCode(
            opts.subscriptionCode,
            existing?.paystackSubscriptionCode,
            opts.reference,
          ),
    paystackCustomerCode:
      opts.customerCode || existing?.paystackCustomerCode || null,
    paystackAuthorizationCode:
      opts.authorizationCode || existing?.paystackAuthorizationCode || null,
    paystackEmailToken: opts.emailToken || existing?.paystackEmailToken || null,
    status: "active",
    currentPeriodStart:
      extended || !existing ? opts.paidAt : existing.currentPeriodStart,
    currentPeriodEnd: periodEnd,
    nextPaymentDate: cancelAtPeriodEnd ? null : cycleEnd,
    cancelAtPeriodEnd,
    cancelledAt: cancelAtPeriodEnd ? (existing?.cancelledAt ?? now) : null,
    ...(opts.countsAsPayment
      ? { lastPaymentDate: opts.paidAt, amountPaidNgn: opts.amountKobo }
      : {}),
    updatedAt: now,
  };

  if (existing) {
    const [row] = await tx
      .update(UserSubscriptionSchema)
      .set(values)
      .where(eq(UserSubscriptionSchema.id, existing.id))
      .returning();
    return { row, created: false };
  }

  const [row] = await tx
    .insert(UserSubscriptionSchema)
    .values({ ...values, userId: opts.userId })
    .returning();
  await tx.insert(SubscriptionChangeLogSchema).values({
    userId: opts.userId,
    subscriptionId: row.id,
    changeType: "upgrade",
    toPlanId: opts.plan.id,
    reason: "Initial subscription purchase",
  });
  return { row, created: true };
}

/**
 * A paid plan change (Monthly → Premium, Premium → Yearly, …): the row moves
 * to the new plan now, its unused paid time is converted into time on the
 * new plan by value (planChangeCreditMs), and the old Paystack subscription
 * code is dropped (it's disabled once the payment is applied — see
 * disableOtherPaystackSubscriptions). The credit keeps the value already
 * paid for (more days on a cheaper plan, fewer on a dearer one) and is
 * stored on the row so later renewals keep it (see creditOf).
 */
async function applyPlanChange(
  tx: Tx,
  existing: SubscriptionRow,
  opts: Parameters<typeof upsertSubscription>[1],
): Promise<{ row: SubscriptionRow; created: boolean }> {
  const [oldPlan] = await tx
    .select()
    .from(SubscriptionPlanSchema)
    .where(eq(SubscriptionPlanSchema.id, existing.planId))
    .limit(1);
  const live =
    existing.status === "active" && existing.currentPeriodEnd > opts.paidAt;
  const creditMs =
    live && oldPlan
      ? planChangeCreditMs({
          now: opts.paidAt,
          oldPeriodEnd: existing.currentPeriodEnd,
          oldPriceKobo: oldPlan.priceNgn,
          oldInterval: normalizeInterval(oldPlan.interval),
          newPriceKobo: opts.plan.priceNgn,
          newInterval: normalizeInterval(opts.plan.interval),
        })
      : 0;
  const base =
    opts.nextPaymentDate && !Number.isNaN(opts.nextPaymentDate.getTime())
      ? opts.nextPaymentDate
      : addInterval(opts.paidAt, normalizeInterval(opts.plan.interval));
  const periodEnd = new Date(base.getTime() + creditMs);
  const now = new Date();
  const [row] = await tx
    .update(UserSubscriptionSchema)
    .set({
      planId: opts.plan.id,
      paystackSubscriptionCode:
        opts.subscriptionCode &&
        !isPlaceholderSubscriptionCode(opts.subscriptionCode)
          ? opts.subscriptionCode
          : `charge_${opts.reference}`,
      paystackCustomerCode:
        opts.customerCode || existing.paystackCustomerCode || null,
      paystackAuthorizationCode:
        opts.authorizationCode || existing.paystackAuthorizationCode || null,
      // The old token belongs to the old subscription
      paystackEmailToken: opts.emailToken || null,
      status: "active",
      currentPeriodStart: opts.paidAt,
      currentPeriodEnd: periodEnd,
      // Paystack charges on its own cycle; the credit is extra access on top
      nextPaymentDate: base,
      metadata: { ...(existing.metadata ?? {}), planChangeCreditMs: creditMs },
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      ...(opts.countsAsPayment
        ? { lastPaymentDate: opts.paidAt, amountPaidNgn: opts.amountKobo }
        : {}),
      updatedAt: now,
    })
    .where(eq(UserSubscriptionSchema.id, existing.id))
    .returning();
  const monthlyRate = (p: PlanRow) =>
    normalizeInterval(p.interval) === "yearly" ? p.priceNgn / 12 : p.priceNgn;
  await tx.insert(SubscriptionChangeLogSchema).values({
    userId: opts.userId,
    subscriptionId: existing.id,
    changeType:
      oldPlan && monthlyRate(opts.plan) < monthlyRate(oldPlan)
        ? "downgrade"
        : "upgrade",
    fromPlanId: existing.planId,
    toPlanId: opts.plan.id,
    reason: `Plan change to ${opts.plan.name}; ${Math.round(creditMs / 3_600_000)}h credited from unused time`,
  });
  return { row, created: false };
}

/**
 * Whether the student started a checkout to switch to `planId` recently.
 * Paystack may send subscription.create before or after charge.success, so
 * both handlers check this to apply the change whichever comes first.
 */
async function hasRecentPlanChangeCheckout(
  userId: string,
  planId: string,
): Promise<boolean> {
  const [row] = await pgDb
    .select({ id: PaymentTransactionSchema.id })
    .from(PaymentTransactionSchema)
    .where(
      and(
        eq(PaymentTransactionSchema.userId, userId),
        sql`${PaymentTransactionSchema.metadata}->>'planId' = ${planId}`,
        // metadata is json (not jsonb): no ? operator
        sql`${PaymentTransactionSchema.metadata}->>'planChange' IS NOT NULL`,
        inArray(PaymentTransactionSchema.status, ["pending", "success"]),
        gte(PaymentTransactionSchema.createdAt, sql`now() - interval '2 days'`),
      ),
    )
    .limit(1);
  return !!row;
}

/**
 * After a plan change, stop the student's other live Paystack
 * subscriptions (the plan they left) so they aren't billed for both. Keeps
 * any subscription on the new plan. Failures are logged loudly; a late
 * charge on the old one can't switch the plan back (see strayOtherSub).
 */
export async function disableOtherPaystackSubscriptions(
  userId: string,
  keepPlanCode: string | null,
): Promise<void> {
  const [user] = await pgDb
    .select({ customerCode: UserSchema.paystackCustomerCode })
    .from(UserSchema)
    .where(eq(UserSchema.id, userId))
    .limit(1);
  if (!user?.customerCode || !keepPlanCode) return;
  try {
    const live = (
      await paystackService.getCustomerSubscriptions(user.customerCode)
    ).filter((s) => s.status === "active" || s.status === "attention");
    for (const sub of live) {
      const details = await paystackService.getSubscription(
        sub.subscription_code,
      );
      const planCode = details?.data?.plan?.plan_code;
      if (planCode === keepPlanCode) continue;
      const token = sub.email_token ?? details?.data?.email_token;
      const res = token
        ? await paystackService.disableSubscription(
            sub.subscription_code,
            token,
          )
        : null;
      if (!res?.status) {
        console.error(
          `[billing] plan change: could not disable old Paystack subscription ${sub.subscription_code} for user ${userId} — disable it by hand`,
        );
      }
    }
  } catch (error) {
    console.error(
      `[billing] plan change: Paystack lookup failed for user ${userId} — old subscription may still renew`,
      error,
    );
  }
}

async function markUserSubscribed(
  tx: Tx,
  userId: string,
  plan: PlanRow,
  customerCode?: string,
) {
  await tx
    .update(UserSchema)
    .set({
      subscriptionStatus: "active",
      currentPlan: plan.name,
      ...(customerCode ? { paystackCustomerCode: customerCode } : {}),
    })
    .where(eq(UserSchema.id, userId));
}

/**
 * Apply a successful individual-plan charge (initial checkout or renewal).
 * Idempotent: replays converge on the same period end, and the receipt is
 * sent exactly once — only by the call that flips the transaction to
 * success (or first records a renewal's transaction).
 */
export async function applyIndividualCharge(
  data: PaystackChargeData,
): Promise<ChargeResult> {
  if (data.status && data.status !== "success") return "ignored_not_success";

  const [txn] = await pgDb
    .select()
    .from(PaymentTransactionSchema)
    .where(eq(PaymentTransactionSchema.paystackReference, data.reference))
    .limit(1);
  if (txn?.metadata?.type === "university_subscription") {
    return "ignored_not_individual";
  }

  const planCode = planCodeOf(data);
  // Plan-less charge we didn't initiate — not a subscription payment.
  if (!txn && !planCode) return "ignored_not_individual";

  const plan =
    (await getPlanByCode(planCode)) ??
    (await getPlanById(txn?.metadata?.planId as string | undefined));
  if (!plan) {
    console.error(
      `[Billing] charge ${data.reference}: unknown plan ${planCode ?? "(none)"}`,
    );
    return "no_plan";
  }

  const subscriptionCode = data.subscription?.subscription_code;
  const userId =
    txn?.userId ??
    (await findUserForPaystackCustomer({
      subscriptionCode,
      customerCode: data.customer?.customer_code,
      email: data.customer?.email,
    }));
  if (!userId) {
    console.error(
      `[Billing] charge ${data.reference}: no user for customer ${data.customer?.customer_code ?? data.customer?.email}`,
    );
    return "no_owner";
  }

  const amountCheck = validateIndividualCharge({
    amountKobo: data.amount,
    currency: data.currency,
    planPriceKobo: plan.priceNgn,
  });
  if (!amountCheck.ok) {
    console.error(
      `[Billing] charge ${data.reference} for user ${userId} NOT applied: ${amountCheck.reason}`,
    );
    if (txn) {
      await pgDb
        .update(PaymentTransactionSchema)
        .set({
          status: "amount_mismatch",
          paystackTransactionId: data.id?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(PaymentTransactionSchema.id, txn.id));
    }
    return "amount_mismatch";
  }

  const paidAt =
    parseDate(data.paid_at) ?? parseDate(data.paidAt) ?? new Date();

  const planChange = !!txn?.metadata?.planChange;

  const outcome = await pgDb.transaction(async (tx) => {
    await lockUser(tx, userId);

    const { row } = await upsertSubscription(tx, {
      userId,
      plan,
      planChange,
      reference: data.reference,
      subscriptionCode,
      customerCode: data.customer?.customer_code,
      authorizationCode: data.authorization?.authorization_code,
      emailToken: data.subscription?.email_token,
      paidAt,
      nextPaymentDate: parseDate(data.subscription?.next_payment_date),
      amountKobo: data.amount,
      countsAsPayment: true,
    });
    await markUserSubscribed(tx, userId, plan, data.customer?.customer_code);

    // Exactly-once receipt: only the call that moves the txn to success.
    let firstSuccess = false;
    if (txn) {
      const flipped = await tx
        .update(PaymentTransactionSchema)
        .set({
          status: "success",
          paidAt,
          paystackTransactionId: data.id?.toString(),
          subscriptionId: row.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(PaymentTransactionSchema.id, txn.id),
            ne(PaymentTransactionSchema.status, "success"),
          ),
        )
        .returning({ id: PaymentTransactionSchema.id });
      firstSuccess = flipped.length > 0;
    } else {
      const inserted = await tx
        .insert(PaymentTransactionSchema)
        .values({
          userId,
          subscriptionId: row.id,
          paystackReference: data.reference,
          paystackTransactionId: data.id?.toString(),
          amountNgn: data.amount!,
          currency: data.currency ?? "NGN",
          status: "success",
          customerEmail: data.customer?.email,
          description: `${plan.displayName} renewal`,
          metadata: { planId: plan.id, planName: plan.name },
          paidAt,
        })
        .onConflictDoNothing({
          target: PaymentTransactionSchema.paystackReference,
        })
        .returning({ id: PaymentTransactionSchema.id });
      firstSuccess = inserted.length > 0;
    }
    return { row, firstSuccess };
  });

  if (planChange) {
    await disableOtherPaystackSubscriptions(userId, plan.paystackPlanCode);
  }

  if (outcome.firstSuccess) {
    const [user] = await pgDb
      .select({ email: UserSchema.email, name: UserSchema.name })
      .from(UserSchema)
      .where(eq(UserSchema.id, userId))
      .limit(1);
    if (user) {
      await sendPaymentReceiptEmail({
        to: user.email,
        userName: user.name,
        plan: {
          displayName: plan.displayName,
          interval: plan.interval,
          features: plan.features,
        },
        amountKobo: data.amount!,
        reference: data.reference,
        paidAt,
        periodEnd: outcome.row.currentPeriodEnd,
      });
    }
  }

  return "applied";
}

/** Subset of Paystack's subscription.* payloads. */
export interface PaystackSubscriptionData {
  subscription_code?: string;
  email_token?: string;
  status?: string;
  next_payment_date?: string | null;
  createdAt?: string;
  created_at?: string;
  plan?: { plan_code?: string } | null;
  customer?: { email?: string; customer_code?: string } | null;
  authorization?: { authorization_code?: string } | null;
}

/**
 * subscription.create: Paystack created the recurring subscription after
 * the first successful charge. Upsert onto the user's row (replacing a
 * charge_<ref> placeholder), store the email token (needed to cancel), and
 * align the period with Paystack's next_payment_date.
 */
export async function applySubscriptionCreate(
  data: PaystackSubscriptionData,
): Promise<"applied" | "no_owner" | "no_plan"> {
  const plan = await getPlanByCode(data.plan?.plan_code);
  if (!plan) {
    console.error(
      `[Billing] subscription.create ${data.subscription_code}: unknown plan ${data.plan?.plan_code}`,
    );
    return "no_plan";
  }
  const userId = await findUserForPaystackCustomer({
    subscriptionCode: data.subscription_code,
    customerCode: data.customer?.customer_code,
    email: data.customer?.email,
  });
  if (!userId) {
    console.error(
      `[Billing] subscription.create ${data.subscription_code}: no user for customer ${data.customer?.customer_code ?? data.customer?.email}`,
    );
    return "no_owner";
  }

  const createdAt =
    parseDate(data.createdAt) ?? parseDate(data.created_at) ?? new Date();
  const planChange = await hasRecentPlanChangeCheckout(userId, plan.id);

  await pgDb.transaction(async (tx) => {
    await lockUser(tx, userId);
    await upsertSubscription(tx, {
      userId,
      plan,
      planChange,
      reference: data.subscription_code ?? createdAt.toISOString(),
      subscriptionCode: data.subscription_code,
      customerCode: data.customer?.customer_code,
      authorizationCode: data.authorization?.authorization_code,
      emailToken: data.email_token,
      paidAt: createdAt,
      nextPaymentDate: parseDate(data.next_payment_date),
      nonRenewing: data.status === "non-renewing",
      countsAsPayment: false,
    });
    await markUserSubscribed(tx, userId, plan, data.customer?.customer_code);
  });
  if (planChange) {
    await disableOtherPaystackSubscriptions(userId, plan.paystackPlanCode);
  }
  return "applied";
}

/** Subset of Paystack's invoice.* payloads. */
export interface PaystackInvoiceData {
  invoice_code?: string;
  amount?: number;
  paid?: boolean | number;
  status?: string;
  paid_at?: string | null;
  subscription?: {
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string | null;
  } | null;
  transaction?: { reference?: string; status?: string } | null;
}

/**
 * invoice.update with a paid invoice = a renewal went through. Extend the
 * period from Paystack's dates. charge.success for the same renewal also
 * extends — computeExtendedPeriodEnd's max() keeps them from stacking.
 */
export async function applyInvoicePaid(
  data: PaystackInvoiceData,
): Promise<"applied" | "ignored_unpaid" | "unknown_subscription"> {
  const paid =
    data.paid === true || data.paid === 1 || data.status === "success";
  if (!paid) return "ignored_unpaid";

  const code = data.subscription?.subscription_code;
  if (!code) return "unknown_subscription";
  const [sub] = await pgDb
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, code))
    .limit(1);
  if (!sub) return "unknown_subscription";

  const plan = await getPlanById(sub.planId);
  if (!plan) return "unknown_subscription";

  const paidAt = parseDate(data.paid_at) ?? new Date();
  await pgDb.transaction(async (tx) => {
    await lockUser(tx, sub.userId);
    await upsertSubscription(tx, {
      userId: sub.userId,
      plan,
      reference: data.transaction?.reference ?? data.invoice_code ?? code,
      subscriptionCode: code,
      emailToken: data.subscription?.email_token,
      paidAt,
      nextPaymentDate: parseDate(data.subscription?.next_payment_date),
      amountKobo: data.amount,
      countsAsPayment: true,
    });
  });
  return "applied";
}

/**
 * subscription.not_renew / subscription.disable: recurring billing has
 * stopped. Mark it non-renewing but DO NOT end access — the student paid
 * for the current period, which lapses on its own at currentPeriodEnd.
 */
export async function applySubscriptionStopped(
  data: PaystackSubscriptionData,
  event: "subscription.not_renew" | "subscription.disable",
): Promise<"applied" | "unknown_subscription"> {
  const code = data.subscription_code;
  if (!code) return "unknown_subscription";
  const [sub] = await pgDb
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, code))
    .limit(1);
  if (!sub) return "unknown_subscription";

  const now = new Date();
  await pgDb.transaction(async (tx) => {
    await tx
      .update(UserSubscriptionSchema)
      .set({
        cancelAtPeriodEnd: true,
        cancelledAt: sub.cancelledAt ?? now,
        nextPaymentDate: null,
        paystackEmailToken: sub.paystackEmailToken ?? data.email_token ?? null,
        updatedAt: now,
      })
      .where(eq(UserSubscriptionSchema.id, sub.id));
    await tx
      .update(UserSchema)
      .set({ subscriptionStatus: "non_renewing" })
      .where(eq(UserSchema.id, sub.userId));
    if (!sub.cancelAtPeriodEnd) {
      await tx.insert(SubscriptionChangeLogSchema).values({
        userId: sub.userId,
        subscriptionId: sub.id,
        changeType: "cancel",
        fromPlanId: sub.planId,
        reason: `${event} via Paystack webhook (access until ${sub.currentPeriodEnd.toISOString()})`,
      });
    }
  });
  return "applied";
}

/**
 * invoice.payment_failed: the renewal charge failed. Access ends now
 * (past_due is excluded from the renewal grace window). A later successful
 * retry (charge.success / invoice.update) reactivates the row.
 */
export async function applyPaymentFailed(data: {
  invoice_code?: string;
  amount?: number;
  subscription?: { subscription_code?: string } | null;
  transaction?: { reference?: string } | null;
  customer?: { email?: string } | null;
}): Promise<"applied" | "unknown_subscription"> {
  const code = data.subscription?.subscription_code;
  if (!code) return "unknown_subscription";
  const [sub] = await pgDb
    .select()
    .from(UserSubscriptionSchema)
    .where(eq(UserSubscriptionSchema.paystackSubscriptionCode, code))
    .limit(1);
  if (!sub) return "unknown_subscription";

  await pgDb
    .update(UserSubscriptionSchema)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(eq(UserSubscriptionSchema.id, sub.id));

  // Deterministic reference so a redelivered event doesn't log twice.
  const reference =
    data.transaction?.reference ||
    `failed_${data.invoice_code ?? `${code}_${sub.currentPeriodEnd.getTime()}`}`;
  await pgDb
    .insert(PaymentTransactionSchema)
    .values({
      userId: sub.userId,
      subscriptionId: sub.id,
      paystackReference: reference,
      amountNgn: data.amount ?? 0,
      status: "failed",
      customerEmail: data.customer?.email,
      description: "Failed subscription renewal",
    })
    .onConflictDoNothing({
      target: PaymentTransactionSchema.paystackReference,
    });
  return "applied";
}
