/**
 * One-time Paystack plan creation script.
 * Creates ASKLY_MONTHLY and ASKLY_YEARLY plans on Paystack,
 * then prints the plan codes to add to .env.local.
 *
 * Usage: pnpm tsx scripts/setup-paystack-plans.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

if (!PAYSTACK_SECRET_KEY) {
  console.error("PAYSTACK_SECRET_KEY not set in .env.local");
  process.exit(1);
}

interface PaystackPlan {
  name: string;
  amount: number; // kobo
  interval: "monthly" | "annually";
  description: string;
  currency: string;
}

const PLANS: PaystackPlan[] = [
  {
    name: "Askly Monthly",
    amount: 300000, // ₦3,000
    interval: "monthly",
    description: "Full access to Askly — billed monthly",
    currency: "NGN",
  },
  {
    name: "Askly Yearly",
    amount: 3000000, // ₦30,000
    interval: "annually",
    description: "Full access to Askly — billed yearly (save ₦6,000)",
    currency: "NGN",
  },
];

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

  console.log("\n=== Add to .env.local ===\n");

  const monthly = results.find((r) => r.name === "Askly Monthly");
  const yearly = results.find((r) => r.name === "Askly Yearly");

  if (monthly) console.log(`PAYSTACK_PLAN_MONTHLY=${monthly.planCode}`);
  if (yearly) console.log(`PAYSTACK_PLAN_YEARLY=${yearly.planCode}`);

  // Update DB with plan codes
  if (monthly || yearly) {
    console.log("\n=== Updating DB plan codes ===\n");

    const POSTGRES_URL = process.env.POSTGRES_URL;
    if (!POSTGRES_URL) {
      console.log(
        "POSTGRES_URL not set — update subscription_plan table manually:",
      );
      if (monthly)
        console.log(
          `  UPDATE subscription_plan SET paystack_plan_code='${monthly.planCode}' WHERE name='ASKLY_MONTHLY';`,
        );
      if (yearly)
        console.log(
          `  UPDATE subscription_plan SET paystack_plan_code='${yearly.planCode}' WHERE name='ASKLY_YEARLY';`,
        );
    } else {
      const { pgDb } = await import("../src/lib/db/pg/db.pg");
      const { SubscriptionPlanSchema } = await import(
        "../src/lib/db/pg/schema.pg"
      );
      const { eq } = await import("drizzle-orm");

      if (monthly) {
        await pgDb
          .update(SubscriptionPlanSchema)
          .set({ paystackPlanCode: monthly.planCode })
          .where(eq(SubscriptionPlanSchema.name, "ASKLY_MONTHLY"));
        console.log(`  ASKLY_MONTHLY → ${monthly.planCode} (updated in DB)`);
      }
      if (yearly) {
        await pgDb
          .update(SubscriptionPlanSchema)
          .set({ paystackPlanCode: yearly.planCode })
          .where(eq(SubscriptionPlanSchema.name, "ASKLY_YEARLY"));
        console.log(`  ASKLY_YEARLY → ${yearly.planCode} (updated in DB)`);
      }
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main();
