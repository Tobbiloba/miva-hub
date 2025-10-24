import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

async function updateNewPlanCodes() {
  try {
    console.log("🚀 Updating Paystack plan codes for new subscription plans...");

    // Update STUDENT plan
    await db
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: "PLN_nl6gpit2wuvdzff" })
      .where(eq(SubscriptionPlanSchema.name, "STUDENT"));

    console.log("✅ Updated STUDENT plan code");

    // Update PREMIUM plan  
    await db
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: "PLN_uw0skkzsrys287p" })
      .where(eq(SubscriptionPlanSchema.name, "PREMIUM"));

    console.log("✅ Updated PREMIUM plan code");

    // Update FACULTY plan with the new Paystack plan code
    await db
      .update(SubscriptionPlanSchema)
      .set({ paystackPlanCode: "PLN_1wpu410bj62uv2p" })
      .where(eq(SubscriptionPlanSchema.name, "FACULTY"));

    console.log("✅ Updated FACULTY plan code");

    // Display updated plans
    const plans = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.isActive, true));

    console.log("\n📊 Updated Subscription Plans:");
    for (const plan of plans) {
      console.log(`   ${plan.name} (${plan.displayName})`);
      console.log(`     Price: ₦${(plan.priceNgn / 100).toLocaleString()}/month`);
      console.log(`     Paystack Code: ${plan.paystackPlanCode}`);
    }

    console.log("\n✨ Plan codes updated successfully!");
    return true;
  } catch (error) {
    console.error("❌ Failed to update plan codes:", error);
    return false;
  }
}

updateNewPlanCodes().then((success) => {
  process.exit(success ? 0 : 1);
});
