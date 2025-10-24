import "load-env";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_API_URL = "https://api.paystack.co";

async function createFacultyPlan() {
  try {
    console.log("🚀 Creating Paystack Faculty Plan for MIVA University\n");

    if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY === "sk_test_your_secret_key_here") {
      console.error("\n❌ ERROR: PAYSTACK_SECRET_KEY not configured!");
      console.error("   Please add your Paystack secret key to the .env file");
      process.exit(1);
    }

    console.log("📝 Creating plan: MIVA Faculty Monthly...");
    
    const response = await fetch(`${PAYSTACK_API_URL}/plan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "MIVA Faculty Monthly",
        amount: 750000, // ₦7,500
        interval: "monthly",
        currency: "NGN",
        description: "MIVA University Faculty Plan - Course creation and student management tools (₦7,500/month)",
      }),
    });

    const data = await response.json();
    
    if (data.status) {
      console.log(`✅ Created plan: MIVA Faculty Monthly`);
      console.log(`   Plan Code: ${data.data.plan_code}`);
      console.log(`   Plan ID: ${data.data.id}`);
      console.log(`   Amount: ₦7,500`);
      
      console.log("\n📝 Next Steps:");
      console.log("1. Update the database with the new plan code:");
      console.log(`\n   UPDATE subscription_plan`);
      console.log(`   SET paystack_plan_code = '${data.data.plan_code}'`);
      console.log(`   WHERE name = 'FACULTY';`);
      
      return data.data.plan_code;
    } else {
      console.error(`❌ Failed to create plan: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error creating faculty plan:", error);
    return null;
  }
}

createFacultyPlan();
