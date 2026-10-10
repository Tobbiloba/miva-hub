import { describe, expect, it } from "vitest";
import {
  INDIVIDUAL_PLANS,
  PREMIUM_YEARLY_SAVINGS_KOBO,
  isIndividualPlanKey,
  planChangeCreditMs,
  planTierByName,
} from "./plans";

const DAY = 86_400_000;
const now = new Date("2026-10-10T12:00:00Z");

describe("Premium plans", () => {
  it("prices Premium at ₦7,500 a month and ₦75,000 a year", () => {
    expect(INDIVIDUAL_PLANS.premium_monthly).toMatchObject({
      name: "ASKLY_PREMIUM_MONTHLY",
      priceKobo: 750_000,
      interval: "monthly",
      paystackInterval: "monthly",
      tier: "premium",
    });
    expect(INDIVIDUAL_PLANS.premium_yearly).toMatchObject({
      name: "ASKLY_PREMIUM_YEARLY",
      priceKobo: 7_500_000,
      interval: "yearly",
      paystackInterval: "annually",
      tier: "premium",
    });
    expect(PREMIUM_YEARLY_SAVINGS_KOBO).toBe(1_500_000);
  });

  it("knows each plan's tier; legacy and unknown plans are standard", () => {
    expect(planTierByName("ASKLY_PREMIUM_YEARLY")).toBe("premium");
    expect(planTierByName("ASKLY_MONTHLY")).toBe("standard");
    expect(planTierByName("PREMIUM")).toBe("standard"); // old ₦5,000 legacy row
    expect(planTierByName(null)).toBe("standard");
  });

  it("only accepts real plan keys at checkout", () => {
    expect(isIndividualPlanKey("premium_monthly")).toBe(true);
    expect(isIndividualPlanKey("premium")).toBe(false);
    expect(isIndividualPlanKey("toString")).toBe(false);
    expect(isIndividualPlanKey(undefined)).toBe(false);
  });

  it("keeps plan names unique", () => {
    const names = Object.values(INDIVIDUAL_PLANS).map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("planChangeCreditMs", () => {
  const monthly = INDIVIDUAL_PLANS.monthly;
  const premium = INDIVIDUAL_PLANS.premium_monthly;

  it("turns 15 unused days of Monthly into 6 days of Premium", () => {
    const credit = planChangeCreditMs({
      now,
      oldPeriodEnd: new Date(now.getTime() + 15 * DAY),
      oldPriceKobo: monthly.priceKobo,
      oldInterval: "monthly",
      newPriceKobo: premium.priceKobo,
      newInterval: "monthly",
    });
    expect(credit / DAY).toBeCloseTo(6, 5);
  });

  it("gives more days when switching down, and values yearly time per day", () => {
    const down = planChangeCreditMs({
      now,
      oldPeriodEnd: new Date(now.getTime() + 10 * DAY),
      oldPriceKobo: premium.priceKobo,
      oldInterval: "monthly",
      newPriceKobo: monthly.priceKobo,
      newInterval: "monthly",
    });
    expect(down / DAY).toBeCloseTo(25, 5);
    // 73 days left of ₦30,000/year ≈ ₦6,000 ≈ 24 days of ₦7,500/month
    const yearlyToPremium = planChangeCreditMs({
      now,
      oldPeriodEnd: new Date(now.getTime() + 73 * DAY),
      oldPriceKobo: INDIVIDUAL_PLANS.yearly.priceKobo,
      oldInterval: "yearly",
      newPriceKobo: premium.priceKobo,
      newInterval: "monthly",
    });
    expect(yearlyToPremium / DAY).toBeCloseTo(24, 0);
  });

  it("gives nothing for a lapsed plan", () => {
    expect(
      planChangeCreditMs({
        now,
        oldPeriodEnd: new Date(now.getTime() - DAY),
        oldPriceKobo: monthly.priceKobo,
        oldInterval: "monthly",
        newPriceKobo: premium.priceKobo,
        newInterval: "monthly",
      }),
    ).toBe(0);
  });
});
