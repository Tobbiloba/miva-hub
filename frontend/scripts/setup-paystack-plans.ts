/**
 * One-time Paystack plan creation script.
 * Creates every plan in src/lib/billing/plans.ts on Paystack (reusing ones
 * that already exist at the same price) and stores the plan codes on the
 * subscription_plan rows.
 *
 * Usage: pnpm tsx scripts/setup-paystack-plans.ts
 */

import { config } from "dotenv";
import { INDIVIDUAL_PLANS } from "../src/lib/billing/plans";
config({ path: ".env.local" });
config({ path: ".env" });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  console.error("PAYSTACK_SECRET_KEY not set in .env.local");
  process.exit(1);
}

// Plans come from the single pricing source of truth.
const PLANS = Object.values(INDIVIDUAL_PLANS).map((plan) => ({
  name: plan.paystackName,
  amount: plan.priceKobo, // kobo
  interval: plan.paystackInterval,
  description: plan.description,
  currency: "NGN",
}));

async function paystackRequest(endpoint: string, method = "GET", body?: any) {
  const res = await fetch(`${PAYSTACK_API_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function main() {
  console.log("=== Paystack Plan Setup ===\n");

  // Fetch existing plans
  const existing = await paystackRequest("/plan?perPage=100");
  const existingPlans: Record<string, string> = {};

  if (existing.status && existing.data) {
    for (const p of existing.data) {
      existingPlans[p.name] = p.plan_code;
    }
  }

  const results: { name: string; planCode: string }[] = [];

  for (const plan of PLANS) {
    if (existingPlans[plan.name]) {
      // Paystack plan amounts are fixed per plan code: a price change needs
      // a NEW Paystack plan, otherwise renewals keep charging the old amount.
      const remote = existing.data.find((p: any) => p.name === plan.name);
      if (remote && remote.amount !== plan.amount) {
        console.error(
          `  ${plan.name}: Paystack amount ${remote.amount} != code ${plan.amount} kobo — create a new plan on Paystack and update the code; not reusing ${existingPlans[plan.name]}`,
        );
        continue;
      }
      console.log(
        `  ${plan.name}: already exists → ${existingPlans[plan.name]}`,
      );
      results.push({ name: plan.name, planCode: existingPlans[plan.name] });
      continue;
    }

    const res = await paystackRequest("/plan", "POST", plan);

    if (!res.status) {
      console.error(`  ${plan.name}: FAILED —`, res.message);
      continue;
    }

    console.log(`  ${plan.name}: created → ${res.data.plan_code}`);
    results.push({ name: plan.name, planCode: res.data.plan_code });
  }

  // Store each plan's code on its subscription_plan row (POSTGRES_URL:
  // .env.local wins, so this is the local DB unless you point it elsewhere)
  if (results.length === 0) return;
  const POSTGRES_URL = process.env.POSTGRES_URL;
  const byName = new Map(
    Object.values(INDIVIDUAL_PLANS).map((p) => [p.paystackName, p.name]),
  );
  if (!POSTGRES_URL) {
    console.log("\nPOSTGRES_URL not set — update subscription_plan manually:");
    for (const r of results) {
      console.log(
        `  UPDATE subscription_plan SET paystack_plan_code='${r.planCode}' WHERE name='${byName.get(r.name)}';`,
      );
    }
    return;
  }
  console.log("\n=== Updating DB plan codes ===\n");
  const { pgDb } = await import("../src/lib/db/pg/db.pg");
  const { SubscriptionPlanSchema } = await import("../src/lib/db/pg/schema.pg");
  const { eq } = await import("drizzle-orm");
  for (const r of results) {
    const name = byName.get(r.name);
    if (!name) continue;
    const updated = await pgDb
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: r.planCode })
      .where(eq(SubscriptionPlanSchema.name, name))
      .returning({ id: SubscriptionPlanSchema.id });
    console.log(
      updated.length
        ? `  ${name} → ${r.planCode} (updated in DB)`
        : `  ${name}: no subscription_plan row — run pnpm db:seed:plans first`,
    );
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
