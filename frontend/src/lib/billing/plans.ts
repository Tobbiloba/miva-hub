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

export type IndividualPlanKey = "monthly" | "yearly";

export interface IndividualPlan {
  key: IndividualPlanKey;
  /** subscription_plan.name */
  name: "ASKLY_MONTHLY" | "ASKLY_YEARLY";
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
}

export const PLAN_FEATURES = [
  "Full AI chat access",
  "All course materials",
  "Flashcards & quizzes",
  "Progress tracking",
  "Email notifications",
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
  },
};

/** Yearly saving vs 12 monthly payments, in kobo. */
export const YEARLY_SAVINGS_KOBO =
  INDIVIDUAL_PLANS.monthly.priceKobo * 12 - INDIVIDUAL_PLANS.yearly.priceKobo;

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
