/**
 * Single source of truth for Askly pricing.
 *
 * Pure module (no DB, no server-only imports) so the billing UI, the
 * Paystack setup/seed scripts and the server can all import it.
 *
 * All amounts are in KOBO (₦1 = 100 kobo), matching the subscription_plan
 * price_ngn / university_subscription price_per_seat_ngn columns, which
 * despite their names also store kobo and pass straight to Paystack.
 *
 * The subscription_plan rows (migration 0033) must agree with these values;
 * checkout refuses to charge if they drift (see assertPlanRowMatches).
 */

export type IndividualPlanKey =
  | "monthly"
  | "yearly"
  | "premium_monthly"
  | "premium_yearly";

/** standard: the core app; premium adds SIWES, final-year project, 300 voice min */
export type PlanTier = "standard" | "premium";

export interface IndividualPlan {
  key: IndividualPlanKey;
  tier: PlanTier;
  /** subscription_plan.name */
  name:
    | "ASKLY_MONTHLY"
    | "ASKLY_YEARLY"
    | "ASKLY_PREMIUM_MONTHLY"
    | "ASKLY_PREMIUM_YEARLY";
  displayName: string;
  /** Plan name on Paystack (setup-paystack-plans.ts matches on it). */
  paystackName: string;
  description: string;
  priceKobo: number;
  /** subscription_plan.interval */
  interval: "monthly" | "yearly";
  /** Paystack's interval vocabulary. */
  paystackInterval: "monthly" | "annually";
  /** "month" / "year" for "₦3,000/month" style copy. */
  periodLabel: "month" | "year";
  /** What the plan includes, for the billing page, receipts and the DB row */
  features: readonly string[];
}

export const PLAN_FEATURES = [
  "Full AI chat access",
  "All course materials",
  "Flashcards & quizzes",
  "Progress tracking",
  "Email notifications",
] as const;

export const PREMIUM_FEATURES = [
  "Everything in the standard plan",
  "300 Voice Coach minutes a month",
  "SIWES logbook and report (coming soon)",
  "Final-year project companion (coming soon)",
] as const;

export const INDIVIDUAL_PLANS: Record<IndividualPlanKey, IndividualPlan> = {
  monthly: {
    key: "monthly",
    name: "ASKLY_MONTHLY",
    displayName: "Askly Monthly",
    paystackName: "Askly Monthly",
    description: "Full access to Askly — billed monthly",
    priceKobo: 300000, // ₦3,000
    interval: "monthly",
    paystackInterval: "monthly",
    periodLabel: "month",
    tier: "standard",
    features: PLAN_FEATURES,
  },
  yearly: {
    key: "yearly",
    name: "ASKLY_YEARLY",
    displayName: "Askly Yearly",
    paystackName: "Askly Yearly",
    description: "Full access to Askly — billed yearly (save ₦6,000)",
    priceKobo: 3000000, // ₦30,000
    interval: "yearly",
    paystackInterval: "annually",
    periodLabel: "year",
    tier: "standard",
    features: PLAN_FEATURES,
  },
  premium_monthly: {
    key: "premium_monthly",
    name: "ASKLY_PREMIUM_MONTHLY",
    displayName: "Askly Premium Monthly",
    paystackName: "Askly Premium Monthly",
    description:
      "Askly plus SIWES, final-year project and more voice — billed monthly",
    priceKobo: 750000, // ₦7,500
    interval: "monthly",
    paystackInterval: "monthly",
    periodLabel: "month",
    tier: "premium",
    features: PREMIUM_FEATURES,
  },
  premium_yearly: {
    key: "premium_yearly",
    name: "ASKLY_PREMIUM_YEARLY",
    displayName: "Askly Premium Yearly",
    paystackName: "Askly Premium Yearly",
    description:
      "Askly plus SIWES, final-year project and more voice — billed yearly (save ₦15,000)",
    priceKobo: 7500000, // ₦75,000
    interval: "yearly",
    paystackInterval: "annually",
    periodLabel: "year",
    tier: "premium",
    features: PREMIUM_FEATURES,
  },
};

export function isIndividualPlanKey(
  value: unknown,
): value is IndividualPlanKey {
  // Own keys only: "toString" etc. are `in` every object
  return typeof value === "string" && Object.hasOwn(INDIVIDUAL_PLANS, value);
}

/** Yearly saving vs 12 monthly payments, in kobo. */
export const YEARLY_SAVINGS_KOBO =
  INDIVIDUAL_PLANS.monthly.priceKobo * 12 - INDIVIDUAL_PLANS.yearly.priceKobo;
export const PREMIUM_YEARLY_SAVINGS_KOBO =
  INDIVIDUAL_PLANS.premium_monthly.priceKobo * 12 -
  INDIVIDUAL_PLANS.premium_yearly.priceKobo;

/**
 * Per-seat org (university) pricing in kobo.
 * monthly: ₦2,000/seat — yearly: ₦20,000/seat.
 */
export const ORG_PRICE_PER_SEAT_KOBO = {
  monthly: 200000,
  yearly: 2000000,
} as const;

export type OrgInterval = keyof typeof ORG_PRICE_PER_SEAT_KOBO;

export function getIndividualPlanByName(
  name: string | null | undefined,
): IndividualPlan | undefined {
  return Object.values(INDIVIDUAL_PLANS).find((p) => p.name === name);
}

/** The tier of a subscription_plan row by name; legacy/unknown plans are standard. */
export function planTierByName(name: string | null | undefined): PlanTier {
  return getIndividualPlanByName(name)?.tier ?? "standard";
}

/**
 * Changing plan mid-period: the unused paid time on the old plan is turned
 * into time on the new one by value, so nobody loses what they paid for and
 * no refund is needed. 15 days left on ₦3,000/month (~₦1,500) becomes ~6
 * days of ₦7,500/month Premium; switching down gives more days instead.
 */
const INTERVAL_MS = {
  monthly: 30 * 24 * 60 * 60 * 1000,
  yearly: 365 * 24 * 60 * 60 * 1000,
} as const;

export function planChangeCreditMs(opts: {
  now: Date;
  oldPeriodEnd: Date;
  oldPriceKobo: number;
  oldInterval: "monthly" | "yearly";
  newPriceKobo: number;
  newInterval: "monthly" | "yearly";
}): number {
  const remaining = opts.oldPeriodEnd.getTime() - opts.now.getTime();
  if (remaining <= 0 || opts.oldPriceKobo <= 0 || opts.newPriceKobo <= 0) {
    return 0;
  }
  const oldRate = opts.oldPriceKobo / INTERVAL_MS[opts.oldInterval];
  const newRate = opts.newPriceKobo / INTERVAL_MS[opts.newInterval];
  return Math.floor((remaining * oldRate) / newRate);
}

/** "₦3,000" from 300000 kobo. */
export function formatNaira(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString("en-NG", {
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Guard against the DB plan row drifting from the code's price: the UI
 * shows INDIVIDUAL_PLANS, Paystack charges the row's price_ngn. If they
 * differ, students would be charged something other than what they saw.
 */
export function assertPlanRowMatches(
  plan: IndividualPlan,
  row: { name: string; priceNgn: number },
): { ok: true } | { ok: false; reason: string } {
  if (row.name !== plan.name) {
    return { ok: false, reason: `plan row ${row.name} is not ${plan.name}` };
  }
  if (row.priceNgn !== plan.priceKobo) {
    return {
      ok: false,
      reason: `${plan.name} price drift: DB ${row.priceNgn} kobo vs code ${plan.priceKobo} kobo`,
    };
  }
  return { ok: true };
}
