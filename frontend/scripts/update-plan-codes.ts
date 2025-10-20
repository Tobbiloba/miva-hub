import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

const PRO_PLAN_CODE = process.env.PRO_PLAN_CODE || "";
const MAX_PLAN_CODE = process.env.MAX_PLAN_CODE || "";

async function updatePlanCodes() {
  console.log("🚀 Updating Paystack plan codes in database...\n");

  if (!PRO_PLAN_CODE || !MAX_PLAN_CODE) {
    console.error("❌ ERROR: Plan codes not provided!");
    console.error("\nUsage:");
    console.error("  PRO_PLAN_CODE=PLN_xxx MAX_PLAN_CODE=PLN_yyy pnpm paystack:update-codes");
    console.error("\nOr add them to your .env file:");
    console.error("  PRO_PLAN_CODE=PLN_xxx");
    console.error("  MAX_PLAN_CODE=PLN_yyy");
    process.exit(1);
  }

  try {
    console.log(`Updating PRO plan code to: ${PRO_PLAN_CODE}`);
    await db
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: PRO_PLAN_CODE })
      .where(eq(SubscriptionPlanSchema.name, "PRO"));
    console.log("✅ PRO plan code updated");

    console.log(`\nUpdating MAX plan code to: ${MAX_PLAN_CODE}`);
    await db
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: MAX_PLAN_CODE })
      .where(eq(SubscriptionPlanSchema.name, "MAX"));
    console.log("✅ MAX plan code updated");

    console.log("\n✅ All plan codes updated successfully!");
    console.log("\n📝 Next step: Test the payment flow at /pricing");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error updating plan codes:", error);
    process.exit(1);
  }
}

updatePlanCodes();
