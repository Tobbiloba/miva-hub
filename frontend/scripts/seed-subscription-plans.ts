/**
 * Seed the live Askly plans (ASKLY_MONTHLY / ASKLY_YEARLY) into
 * subscription_plan from the pricing source of truth (src/lib/billing/plans).
 * Upserts by name; never touches paystack_plan_code (that is set by
 * scripts/setup-paystack-plans.ts). Legacy plans (STUDENT/PREMIUM/FACULTY/
 * PRO/MAX) are deactivated so nothing lists them.
 *
 * NOTE: changing a price here does NOT change what Paystack charges on
 * renewal — Paystack plan amounts are fixed per plan code. A price change
 * needs a new Paystack plan (setup-paystack-plans.ts) too.
 *
 * Usage: pnpm db:seed:plans   (check POSTGRES_URL points where you think!)
 */
import "load-env";
import { inArray } from "drizzle-orm";
import { INDIVIDUAL_PLANS, PLAN_FEATURES } from "lib/billing/plans";
import { pgDb as db } from "lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "lib/db/pg/schema.pg";

const UNLIMITED_LIMITS = {
  ai_messages_per_day: -1,
  quizzes_per_week: -1,
  exams_per_month: -1,
  flashcard_sets_per_week: -1,
  max_courses: -1,
};

const LEGACY_PLAN_NAMES = ["STUDENT", "PREMIUM", "FACULTY", "PRO", "MAX"];

async function seedSubscriptionPlans(): Promise<boolean> {
  try {
    console.log("💳 Seeding Askly subscription plans...");

    for (const plan of Object.values(INDIVIDUAL_PLANS)) {
      const values = {
        name: plan.name,
        displayName: plan.displayName,
        description: plan.description,
        priceNgn: plan.priceKobo,
        interval: plan.interval,
        features: [...PLAN_FEATURES],
        limits: UNLIMITED_LIMITS,
        isActive: true,
      };
      await db
        .insert(SubscriptionPlanSchema)
        .values(values)
        .onConflictDoUpdate({
          target: SubscriptionPlanSchema.name,
          set: { ...values, updatedAt: new Date() },
        });
      console.log(
        `  ✅ ${plan.name}: ${plan.priceKobo} kobo / ${plan.interval}`,
      );
    }

    const deactivated = await db
      .update(SubscriptionPlanSchema)
      .set({ isActive: false, updatedAt: new Date() })
      .where(inArray(SubscriptionPlanSchema.name, LEGACY_PLAN_NAMES))
      .returning({ name: SubscriptionPlanSchema.name });
    if (deactivated.length > 0) {
      console.log(
        `  ⏸  Deactivated legacy plans: ${deactivated.map((d) => d.name).join(", ")}`,
      );
    }

    console.log("Done. Run scripts/setup-paystack-plans.ts to set plan codes.");
    return true;
  } catch (error) {
    console.error("❌ Plan seeding failed:", error);
    return false;
  }
}

seedSubscriptionPlans().then((success) => {
  process.exit(success ? 0 : 1);
});
