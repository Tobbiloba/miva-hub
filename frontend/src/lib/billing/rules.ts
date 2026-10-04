/**
 * Pure billing rules — no DB, no network. Everything that decides money or
 * access lives here so it can be unit-tested (rules.test.ts) and shared by
 * the webhook, the browser-callback verify route, and the paywall.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// ─── Webhooks ────────────────────────────────────────────────────────────

/** Paystack signs the raw body with HMAC-SHA512 keyed by the secret key. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secretKey: string | null | undefined,
): boolean {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (given.length !== expected.length) return false;
  return timingSafeEqual(expected, given);
}

/**
 * Idempotency key for a webhook delivery: sha256 of the exact raw body.
 * Paystack redelivers the identical payload on retry, so retries collide
 * here, while distinct events that share data.id (subscription.create /
 * not_renew / disable all carry the subscription's id) do not.
 */
export function computeWebhookEventKey(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

/**
 * What to do with a delivery after `INSERT … ON CONFLICT (event_key) DO
 * NOTHING`:
 *  - inserted a new row               → process it
 *  - row existed and was processed    → no-op, answer 200
 *  - row existed but never succeeded  → process again (earlier attempt
 *    failed or crashed; Paystack is retrying because we returned non-200)
 */
export function decideWebhookDelivery(
  existing: { processed: boolean | null } | null,
): "process" | "skip_already_processed" {
  if (existing?.processed) return "skip_already_processed";
  return "process";
}

// ─── Billing periods ─────────────────────────────────────────────────────

export type BillingInterval = "monthly" | "yearly";

/** Paystack plan intervals → ours. Unknown values fall back to monthly. */
export function normalizeInterval(
  interval: string | null | undefined,
): BillingInterval {
  return interval === "annually" || interval === "yearly"
    ? "yearly"
    : "monthly";
}

/**
 * Calendar add, clamped to the target month's last day (Jan 31 + 1 month →
 * Feb 28/29, not Mar 3). UTC so server timezone can't shift the result.
 */
export function addInterval(from: Date, interval: BillingInterval): Date {
  const months = interval === "yearly" ? 12 : 1;
  const y = from.getUTCFullYear();
  const m = from.getUTCMonth() + months;
  const targetYear = y + Math.floor(m / 12);
  const targetMonth = m % 12;
  const lastDay = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  const day = Math.min(from.getUTCDate(), lastDay);
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      day,
      from.getUTCHours(),
      from.getUTCMinutes(),
      from.getUTCSeconds(),
      from.getUTCMilliseconds(),
    ),
  );
}

/**
 * New currentPeriodEnd after a successful payment (initial or renewal).
 *
 * candidate = Paystack's next_payment_date when it gives one, else
 *             paidAt + plan interval.
 * result    = max(existing end, candidate).
 *
 * The max() makes this idempotent and order-independent: the initial
 * charge.success and subscription.create describe the same period, so
 * whichever lands second doesn't extend again; a redelivered event yields
 * the same date; an out-of-order older event can't shorten access.
 */
export function computeExtendedPeriodEnd(opts: {
  currentPeriodEnd: Date | null | undefined;
  paidAt: Date;
  interval: BillingInterval;
  nextPaymentDate?: Date | null;
}): Date {
  const candidate =
    opts.nextPaymentDate && !Number.isNaN(opts.nextPaymentDate.getTime())
      ? opts.nextPaymentDate
      : addInterval(opts.paidAt, opts.interval);
  if (opts.currentPeriodEnd && opts.currentPeriodEnd > candidate) {
    return opts.currentPeriodEnd;
  }
  return candidate;
}

/**
 * Paystack charges a renewing subscription ON its next_payment_date, and
 * the charge.success webhook can land minutes-to-hours later. A renewing
 * (not cancelled) subscription keeps access for this long past its period
 * end so students aren't paywalled while the renewal is in flight. A failed
 * renewal (invoice.payment_failed → past_due) ends access immediately.
 */
export const RENEWAL_GRACE_MS = 48 * 60 * 60 * 1000;

export function subscriptionGrantsAccess(
  sub: {
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean | null;
  },
  now: Date,
): boolean {
  if (sub.status !== "active" && sub.status !== "trialing") return false;
  if (sub.currentPeriodEnd >= now) return true;
  return (
    !sub.cancelAtPeriodEnd &&
    sub.currentPeriodEnd.getTime() + RENEWAL_GRACE_MS >= now.getTime()
  );
}

/**
 * subscription_code values like "charge_<ref>" are placeholders written
 * when a charge arrived before Paystack told us the real SUB_ code.
 */
export function isPlaceholderSubscriptionCode(
  code: string | null | undefined,
): boolean {
  return !code || !code.startsWith("SUB_");
}

// ─── Amount checks ───────────────────────────────────────────────────────

export type AmountCheck = { ok: true } | { ok: false; reason: string };

/** Individual plan charge: NGN and at least the plan row's price. */
export function validateIndividualCharge(opts: {
  amountKobo: number | null | undefined;
  currency: string | null | undefined;
  planPriceKobo: number;
}): AmountCheck {
  if ((opts.currency ?? "NGN").toUpperCase() !== "NGN") {
    return { ok: false, reason: `unexpected currency ${opts.currency}` };
  }
  if (
    typeof opts.amountKobo !== "number" ||
    !Number.isFinite(opts.amountKobo)
  ) {
    return { ok: false, reason: "missing amount" };
  }
  if (opts.amountKobo < opts.planPriceKobo) {
    return {
      ok: false,
      reason: `underpaid: ${opts.amountKobo} kobo < plan price ${opts.planPriceKobo} kobo`,
    };
  }
  return { ok: true };
}

/**
 * Org seat payment: NGN and at least seatLimit × pricePerSeat.
 * price_per_seat_ngn already stores KOBO (200000 = ₦2,000), so the expected
 * total is seatLimit × pricePerSeatKobo — no extra ×100.
 */
export function validateOrgPayment(opts: {
  amountKobo: number | null | undefined;
  currency: string | null | undefined;
  seatLimit: number;
  pricePerSeatKobo: number;
}): AmountCheck {
  if ((opts.currency ?? "NGN").toUpperCase() !== "NGN") {
    return { ok: false, reason: `unexpected currency ${opts.currency}` };
  }
  if (
    typeof opts.amountKobo !== "number" ||
    !Number.isFinite(opts.amountKobo)
  ) {
    return { ok: false, reason: "missing amount" };
  }
  if (opts.seatLimit < 1 || opts.pricePerSeatKobo < 1) {
    return { ok: false, reason: "subscription has no billable seats" };
  }
  const expected = opts.seatLimit * opts.pricePerSeatKobo;
  if (opts.amountKobo < expected) {
    return {
      ok: false,
      reason: `underpaid: ${opts.amountKobo} kobo < ${opts.seatLimit} seats × ${opts.pricePerSeatKobo} = ${expected} kobo`,
    };
  }
  return { ok: true };
}

// ─── Org seat coverage ───────────────────────────────────────────────────

/**
 * Seat rule: a university's covering subscriptions grant `seatLimit` seats
 * (summed across every block whose period covers today — each paid or
 * comped block is a separate purchase of seats). Seats go to the
 * university's active-enrollment students in signup order (created_at, then
 * id as tie-break): a student is covered iff fewer than `seatLimit` such
 * students signed up before them. Deterministic, needs no seat-assignment
 * table, and never evicts an existing student when a new one joins —
 * overflow students simply aren't covered and fall back to their own
 * trial/subscription.
 */
export function isWithinSeatLimit(
  studentsAhead: number,
  seatLimit: number,
): boolean {
  return studentsAhead < seatLimit;
}

// ─── Paywall decision ────────────────────────────────────────────────────

export interface PaidAccessFacts {
  userExists: boolean;
  role: string | null | undefined;
  trialEndsAt: Date | null | undefined;
  hasActiveSubscription: boolean;
  coveredByUniversity: boolean;
  now: Date;
}

export type PaidAccessDecision =
  | {
      allowed: true;
      via: "exempt_role" | "trial" | "subscription" | "university";
    }
  | {
      allowed: false;
      code: "no_user" | "trial_expired" | "no_subscription";
      reason: string;
    };

/**
 * Order: unknown user → deny; non-student roles (faculty, admin,
 * super_admin) → exempt; active trial → allow; own active subscription →
 * allow; university seat → allow; otherwise deny. A null role is treated
 * as a student (fail closed — the column defaults to "student").
 */
export function decidePaidAccess(f: PaidAccessFacts): PaidAccessDecision {
  if (!f.userExists) {
    return {
      allowed: false,
      code: "no_user",
      reason: "Account not found.",
    };
  }
  if (f.role && f.role !== "student") {
    return { allowed: true, via: "exempt_role" };
  }
  if (f.trialEndsAt && f.trialEndsAt > f.now) {
    return { allowed: true, via: "trial" };
  }
  if (f.hasActiveSubscription) {
    return { allowed: true, via: "subscription" };
  }
  if (f.coveredByUniversity) {
    return { allowed: true, via: "university" };
  }
  return f.trialEndsAt
    ? {
        allowed: false,
        code: "trial_expired",
        reason:
          "Your free trial has ended. Subscribe to keep using Askly's AI features.",
      }
    : {
        allowed: false,
        code: "no_subscription",
        reason: "An active Askly subscription is required for this feature.",
      };
}
