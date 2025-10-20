import { config } from "dotenv";
config({ path: ".env" });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

interface PaystackPlan {
  name: string;
  amount: number;
  interval: string;
  description?: string;
}

async function createPlan(plan: PaystackPlan) {
  try {
    console.log(`\n📝 Creating plan: ${plan.name}...`);
    
    const response = await fetch(`${PAYSTACK_API_URL}/plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...plan,
        currency: "NGN",
      }),
    });

    const data = await response.json();
    
    if (data.status) {
      console.log(`✅ Created plan: ${plan.name}`);
      console.log(`   Plan Code: ${data.data.plan_code}`);
      console.log(`   Plan ID: ${data.data.id}`);
      console.log(`   Amount: ₦${(plan.amount / 100).toLocaleString()}`);
      return data.data;
    } else {
      console.error(`❌ Failed to create plan: ${plan.name}`);
      console.error(`   Error: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating plan: ${plan.name}`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Creating Paystack Subscription Plans for MIVA University\n");
  console.log("=" .repeat(60));

  if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === "sk_test_your_secret_key_here") {
    console.error("\n❌ ERROR: PAYSTACK_SECRET_KEY not configured!");
    console.error("   Please add your Paystack secret key to the .env file");
    console.error("   Get it from: https://dashboard.paystack.com/#/settings/developer");
    process.exit(1);
  }

  const proPlan = await createPlan({
    name: "MIVA PRO Monthly",
    amount: 250000,
    interval: "monthly",
    description: "MIVA University PRO Plan - Smart studying for regular students (₦2,500/month)",
  });

  const maxPlan = await createPlan({
    name: "MIVA MAX Monthly",
    amount: 550000,
    interval: "monthly",
    description: "MIVA University MAX Plan - Unlimited access with advanced features (₦5,500/month)",
  });

  console.log("\n" + "=".repeat(60));
  console.log("\n✅ Plan creation complete!");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Copy the plan codes above");
  console.log("2. Update the database subscription_plan table:");
  console.log("\n   SQL Commands:");
  
  if (proPlan) {
    console.log(`\n   UPDATE subscription_plan`);
    console.log(`   SET paystack_plan_code = '${proPlan.plan_code}'`);
    console.log(`   WHERE name = 'PRO';`);
  }
  
  if (maxPlan) {
    console.log(`\n   UPDATE subscription_plan`);
    console.log(`   SET paystack_plan_code = '${maxPlan.plan_code}'`);
    console.log(`   WHERE name = 'MAX';`);
  }
  
  console.log("\n3. Or run: pnpm paystack:update-codes\n");
}

main();
