import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import {
  INDIVIDUAL_PLANS,
  ORG_PRICE_PER_SEAT_KOBO,
  YEARLY_SAVINGS_KOBO,
  assertPlanRowMatches,
  formatNaira,
} from "./plans";
import {
  RENEWAL_GRACE_MS,
  addInterval,
  computeExtendedPeriodEnd,
  computeWebhookEventKey,
  decidePaidAccess,
  decideWebhookDelivery,
  isPlaceholderSubscriptionCode,
  isWithinSeatLimit,
  normalizeInterval,
  subscriptionGrantsAccess,
  validateIndividualCharge,
  validateOrgPayment,
  verifyPaystackSignature,
} from "./rules";

const SECRET = "sk_test_secret";
const sign = (body: string, key = SECRET) =>
  createHmac("sha512", key).update(body).digest("hex");

describe("verifyPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });

  it("accepts a correct HMAC-SHA512 signature", () => {
    expect(verifyPaystackSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a signature made with another key", () => {
    expect(verifyPaystackSignature(body, sign(body, "other"), SECRET)).toBe(
      false,
    );
  });

  it("rejects a tampered body", () => {
    expect(verifyPaystackSignature(`${body} `, sign(body), SECRET)).toBe(false);
  });

  it("rejects missing/garbage signature or missing secret", () => {
    expect(verifyPaystackSignature(body, null, SECRET)).toBe(false);
    expect(verifyPaystackSignature(body, "", SECRET)).toBe(false);
    expect(verifyPaystackSignature(body, "zz-not-hex", SECRET)).toBe(false);
    expect(verifyPaystackSignature(body, sign(body).slice(0, 64), SECRET)).toBe(
      false,
    );
    expect(verifyPaystackSignature(body, sign(body), undefined)).toBe(false);
  });
});

describe("webhook idempotency", () => {
  it("event key is sha256 hex of the raw body, stable across calls", () => {
    const body = '{"event":"subscription.create","data":{"id":42}}';
    const key = computeWebhookEventKey(body);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(computeWebhookEventKey(body)).toBe(key);
  });

  it("distinct events sharing data.id get distinct keys", () => {
    const create = '{"event":"subscription.create","data":{"id":42}}';
    const disable = '{"event":"subscription.disable","data":{"id":42}}';
    expect(computeWebhookEventKey(create)).not.toBe(
      computeWebhookEventKey(disable),
    );
  });

  it("processes new deliveries, skips processed, reprocesses failed", () => {
    expect(decideWebhookDelivery(null)).toBe("process");
    expect(decideWebhookDelivery({ processed: false })).toBe("process");
    expect(decideWebhookDelivery({ processed: null })).toBe("process");
    expect(decideWebhookDelivery({ processed: true })).toBe(
      "skip_already_processed",
    );
  });
});

describe("period math", () => {
  it("normalizes Paystack and DB interval names", () => {
    expect(normalizeInterval("annually")).toBe("yearly");
    expect(normalizeInterval("yearly")).toBe("yearly");
    expect(normalizeInterval("monthly")).toBe("monthly");
    expect(normalizeInterval(undefined)).toBe("monthly");
  });

  it("adds calendar months/years, clamping to month end", () => {
    expect(
      addInterval(new Date("2026-01-15T10:00:00Z"), "monthly").toISOString(),
    ).toBe("2026-02-15T10:00:00.000Z");
    expect(
      addInterval(new Date("2026-01-31T10:00:00Z"), "monthly").toISOString(),
    ).toBe("2026-02-28T10:00:00.000Z");
    expect(
      addInterval(new Date("2028-01-31T00:00:00Z"), "monthly").toISOString(),
    ).toBe("2028-02-29T00:00:00.000Z");
    expect(
      addInterval(new Date("2026-12-10T00:00:00Z"), "monthly").toISOString(),
    ).toBe("2027-01-10T00:00:00.000Z");
    expect(
      addInterval(new Date("2028-02-29T00:00:00Z"), "yearly").toISOString(),
    ).toBe("2029-02-28T00:00:00.000Z");
  });

  const paidAt = new Date("2026-03-01T09:00:00Z");

  it("initial charge: end = paidAt + interval", () => {
    expect(
      computeExtendedPeriodEnd({
        currentPeriodEnd: null,
        paidAt,
        interval: "monthly",
      }).toISOString(),
    ).toBe("2026-04-01T09:00:00.000Z");
  });

  it("prefers Paystack's next_payment_date when given", () => {
    const next = new Date("2026-04-02T00:00:00Z");
    expect(
      computeExtendedPeriodEnd({
        currentPeriodEnd: null,
        paidAt,
        interval: "monthly",
        nextPaymentDate: next,
      }),
    ).toEqual(next);
  });

  it("renewal at period end extends by one interval", () => {
    const currentEnd = new Date("2026-04-01T09:00:00Z");
    const renewalPaidAt = new Date("2026-04-01T09:05:00Z");
    expect(
      computeExtendedPeriodEnd({
        currentPeriodEnd: currentEnd,
        paidAt: renewalPaidAt,
        interval: "monthly",
      }).toISOString(),
    ).toBe("2026-05-01T09:05:00.000Z");
  });

  it("is idempotent: replaying the same charge does not extend again", () => {
    const first = computeExtendedPeriodEnd({
      currentPeriodEnd: null,
      paidAt,
      interval: "yearly",
    });
    const replay = computeExtendedPeriodEnd({
      currentPeriodEnd: first,
      paidAt,
      interval: "yearly",
    });
    expect(replay).toEqual(first);
  });

  it("charge.success + subscription.create for the same period don't stack", () => {
    const afterCharge = computeExtendedPeriodEnd({
      currentPeriodEnd: null,
      paidAt,
      interval: "monthly",
    });
    const afterCreate = computeExtendedPeriodEnd({
      currentPeriodEnd: afterCharge,
      paidAt,
      interval: "monthly",
      nextPaymentDate: new Date("2026-04-01T08:59:00Z"),
    });
    expect(afterCreate).toEqual(afterCharge);
  });

  it("an out-of-order older event never shortens access", () => {
    const currentEnd = new Date("2026-06-01T00:00:00Z");
    expect(
      computeExtendedPeriodEnd({
        currentPeriodEnd: currentEnd,
        paidAt,
        interval: "monthly",
      }),
    ).toEqual(currentEnd);
  });

  it("ignores an invalid next_payment_date", () => {
    expect(
      computeExtendedPeriodEnd({
        currentPeriodEnd: null,
        paidAt,
        interval: "monthly",
        nextPaymentDate: new Date("not a date"),
      }).toISOString(),
    ).toBe("2026-04-01T09:00:00.000Z");
  });
});

describe("subscriptionGrantsAccess", () => {
  const now = new Date("2026-05-01T12:00:00Z");
  const past = (ms: number) => new Date(now.getTime() - ms);
  const future = new Date("2026-05-20T00:00:00Z");

  it("active within period → access", () => {
    expect(
      subscriptionGrantsAccess(
        {
          status: "active",
          currentPeriodEnd: future,
          cancelAtPeriodEnd: false,
        },
        now,
      ),
    ).toBe(true);
  });

  it("cancel-at-period-end keeps access until the period ends", () => {
    expect(
      subscriptionGrantsAccess(
        { status: "active", currentPeriodEnd: future, cancelAtPeriodEnd: true },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsAccess(
        {
          status: "active",
          currentPeriodEnd: past(60_000),
          cancelAtPeriodEnd: true,
        },
        now,
      ),
    ).toBe(false);
  });

  it("renewing subscription gets the renewal grace window only", () => {
    const sub = { status: "active", cancelAtPeriodEnd: false };
    expect(
      subscriptionGrantsAccess(
        { ...sub, currentPeriodEnd: past(RENEWAL_GRACE_MS - 1000) },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionGrantsAccess(
        { ...sub, currentPeriodEnd: past(RENEWAL_GRACE_MS + 1000) },
        now,
      ),
    ).toBe(false);
  });

  it("past_due / cancelled never grant access", () => {
    for (const status of ["past_due", "cancelled", "expired"]) {
      expect(
        subscriptionGrantsAccess(
          { status, currentPeriodEnd: future, cancelAtPeriodEnd: false },
          now,
        ),
      ).toBe(false);
    }
  });

  it("detects charge_<ref> placeholder subscription codes", () => {
    expect(isPlaceholderSubscriptionCode("charge_abc123")).toBe(true);
    expect(isPlaceholderSubscriptionCode("")).toBe(true);
    expect(isPlaceholderSubscriptionCode(null)).toBe(true);
    expect(isPlaceholderSubscriptionCode("SUB_vsyqdmlzble3uii")).toBe(false);
  });
});

describe("amount validation", () => {
  const monthly = INDIVIDUAL_PLANS.monthly.priceKobo;

  it("individual: accepts exact NGN amount", () => {
    expect(
      validateIndividualCharge({
        amountKobo: monthly,
        currency: "NGN",
        planPriceKobo: monthly,
      }),
    ).toEqual({ ok: true });
  });

  it("individual: rejects underpayment, wrong currency, missing amount", () => {
    expect(
      validateIndividualCharge({
        amountKobo: monthly - 1,
        currency: "NGN",
        planPriceKobo: monthly,
      }).ok,
    ).toBe(false);
    expect(
      validateIndividualCharge({
        amountKobo: monthly,
        currency: "USD",
        planPriceKobo: monthly,
      }).ok,
    ).toBe(false);
    expect(
      validateIndividualCharge({
        amountKobo: undefined,
        currency: "NGN",
        planPriceKobo: monthly,
      }).ok,
    ).toBe(false);
  });

  const perSeat = ORG_PRICE_PER_SEAT_KOBO.monthly;

  it("org: requires seatLimit × pricePerSeat (kobo, no extra ×100)", () => {
    expect(
      validateOrgPayment({
        amountKobo: 50 * perSeat,
        currency: "NGN",
        seatLimit: 50,
        pricePerSeatKobo: perSeat,
      }),
    ).toEqual({ ok: true });
    expect(
      validateOrgPayment({
        amountKobo: 50 * perSeat - 100,
        currency: "NGN",
        seatLimit: 50,
        pricePerSeatKobo: perSeat,
      }).ok,
    ).toBe(false);
  });

  it("org: paying for 1 seat can't activate a 1000-seat row", () => {
    expect(
      validateOrgPayment({
        amountKobo: perSeat,
        currency: "NGN",
        seatLimit: 1000,
        pricePerSeatKobo: perSeat,
      }).ok,
    ).toBe(false);
  });

  it("org: rejects wrong currency and zero-seat rows", () => {
    expect(
      validateOrgPayment({
        amountKobo: 10 * perSeat,
        currency: "GHS",
        seatLimit: 10,
        pricePerSeatKobo: perSeat,
      }).ok,
    ).toBe(false);
    expect(
      validateOrgPayment({
        amountKobo: 0,
        currency: "NGN",
        seatLimit: 0,
        pricePerSeatKobo: perSeat,
      }).ok,
    ).toBe(false);
  });

  it("seat limit: first N students by signup order are covered", () => {
    expect(isWithinSeatLimit(0, 1)).toBe(true);
    expect(isWithinSeatLimit(49, 50)).toBe(true);
    expect(isWithinSeatLimit(50, 50)).toBe(false);
    expect(isWithinSeatLimit(0, 0)).toBe(false);
  });
});

describe("decidePaidAccess", () => {
  const now = new Date("2026-05-01T12:00:00Z");
  const base = {
    userExists: true,
    role: "student" as string | null,
    trialEndsAt: null as Date | null,
    hasActiveSubscription: false,
    coveredByUniversity: false,
    now,
  };
  const tomorrow = new Date("2026-05-02T12:00:00Z");
  const yesterday = new Date("2026-04-30T12:00:00Z");

  it.each([
    ["unknown user", { userExists: false }, false, "no_user"],
    ["faculty exempt", { role: "faculty" }, true, "exempt_role"],
    ["admin exempt", { role: "admin" }, true, "exempt_role"],
    ["super_admin exempt", { role: "super_admin" }, true, "exempt_role"],
    ["student in trial", { trialEndsAt: tomorrow }, true, "trial"],
    [
      "trial ended, own subscription",
      { trialEndsAt: yesterday, hasActiveSubscription: true },
      true,
      "subscription",
    ],
    [
      "trial ended, university seat",
      { trialEndsAt: yesterday, coveredByUniversity: true },
      true,
      "university",
    ],
    [
      "trial ended, nothing else",
      { trialEndsAt: yesterday },
      false,
      "trial_expired",
    ],
    ["never had a trial, nothing else", {}, false, "no_subscription"],
    [
      "null role is treated as a student (fail closed)",
      { role: null },
      false,
      "no_subscription",
    ],
  ] as const)("%s", (_label, overrides, allowed, tag) => {
    const decision = decidePaidAccess({ ...base, ...overrides });
    expect(decision.allowed).toBe(allowed);
    if (decision.allowed) expect(decision.via).toBe(tag);
    else {
      expect(decision.code).toBe(tag);
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });

  it("trial ending exactly now is expired", () => {
    expect(decidePaidAccess({ ...base, trialEndsAt: now }).allowed).toBe(false);
  });
});

describe("plans source of truth", () => {
  it("matches migration 0033 prices (kobo)", () => {
    expect(INDIVIDUAL_PLANS.monthly).toMatchObject({
      name: "ASKLY_MONTHLY",
      priceKobo: 300000,
      interval: "monthly",
      paystackInterval: "monthly",
    });
    expect(INDIVIDUAL_PLANS.yearly).toMatchObject({
      name: "ASKLY_YEARLY",
      priceKobo: 3000000,
      interval: "yearly",
      paystackInterval: "annually",
    });
    expect(YEARLY_SAVINGS_KOBO).toBe(600000);
    expect(formatNaira(300000)).toBe("₦3,000");
  });

  it("flags DB price drift", () => {
    expect(
      assertPlanRowMatches(INDIVIDUAL_PLANS.monthly, {
        name: "ASKLY_MONTHLY",
        priceNgn: 300000,
      }).ok,
    ).toBe(true);
    expect(
      assertPlanRowMatches(INDIVIDUAL_PLANS.monthly, {
        name: "ASKLY_MONTHLY",
        priceNgn: 250000,
      }).ok,
    ).toBe(false);
  });
});
