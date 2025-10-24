import "load-env";
import { pgDb as db } from "lib/db/pg/db.pg";
import { SubscriptionPlanSchema } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

console.log("💳 Starting Subscription Plans Seeding...");

async function seedSubscriptionPlans() {
  try {
    // Define the subscription plans with realistic limits based on usage tracking
    const plansData = [
      {
        name: "PRO",
        displayName: "PRO Plan",
        description: "Perfect for regular students",
        priceNgn: 250000, // ₦2,500 (stored in kobo)
        priceUsd: 160,
        interval: "monthly",
        features: [
          "30 AI study questions per day (ask_study_question, explain_concept_deeply, compare_concepts, get_learning_path)",
          "10 course material searches per day",
          "4 quiz generations per week",
          "4 flashcard sets per week",
          "3 practice problem sets per week",
          "2 study guides per week",
          "1 exam simulator per month",
          "Course materials & schedules access",
          "Progress tracking dashboard",
          "Email support (24-48 hour response)",
          "Mobile app access",
        ],
        limits: {
          // Daily limits
          ai_messages_per_day: 30,
          material_searches_per_day: 10,
          // Weekly limits
          quizzes_per_week: 4,
          flashcard_sets_per_week: 4,
          practice_problems_per_week: 3,
          study_guides_per_week: 2,
          // Monthly limits
          exams_per_month: 1,
        },
      },
      {
        name: "MAX",
        displayName: "MAX Plan",
        description: "Unlimited access with advanced features",
        priceNgn: 550000, // ₦5,500 (stored in kobo)
        priceUsd: 350,
        interval: "monthly",
        features: [
          "Unlimited AI study questions per day",
          "Unlimited course material searches per day",
          "Unlimited quiz generations per week",
          "Unlimited flashcard sets per week",
          "Unlimited practice problem sets per week",
          "Unlimited study guides per week",
          "4 exam simulators per month (vs 1 in PRO)",
          "All course materials & schedules",
          "Advanced progress tracking with AI insights",
          "Priority email support (4-hour response)",
          "24/7 live chat support",
          "Personalized learning path recommendations",
          "Detailed performance analytics",
          "Export study materials & notes (PDF, Word, CSV)",
          "Priority AI tutor sessions",
          "Group study collaboration tools",
          "Note-to-flashcard conversion (unlimited)",
          "Mobile app + desktop app access",
          "Cancel anytime (no lock-in)",
        ],
        limits: {
          // All daily limits unlimited
          ai_messages_per_day: -1,
          material_searches_per_day: -1,
          // All weekly limits unlimited
          quizzes_per_week: -1,
          flashcard_sets_per_week: -1,
          practice_problems_per_week: -1,
          study_guides_per_week: -1,
          // Monthly limits - 4x more than PRO
          exams_per_month: 4,
        },
      },
    ];

    // Check if plans already exist
    const existingPlans = await db
      .select()
      .from(SubscriptionPlanSchema);

    if (existingPlans.length > 0) {
      console.log(`⚠️  Plans already exist in database. Updating instead...`);

      // Update existing plans
      for (const planData of plansData) {
        const existingPlan = existingPlans.find(p => p.name === planData.name);

        if (existingPlan) {
          await db
            .update(SubscriptionPlanSchema)
            .set({
              displayName: planData.displayName,
              description: planData.description,
              priceNgn: planData.priceNgn,
              priceUsd: planData.priceUsd,
              features: planData.features,
              limits: planData.limits,
              isActive: true,
            })
            .where(eq(SubscriptionPlanSchema.id, existingPlan.id));

          console.log(`✅ Updated plan: ${planData.name} (${planData.displayName})`);
        } else {
          await db
            .insert(SubscriptionPlanSchema)
            .values({
              name: planData.name,
              displayName: planData.displayName,
              description: planData.description,
              priceNgn: planData.priceNgn,
              priceUsd: planData.priceUsd,
              interval: planData.interval,
              features: planData.features,
              limits: planData.limits,
              isActive: true,
            });

          console.log(`✅ Created plan: ${planData.name} (${planData.displayName})`);
        }
      }
    } else {
      // Insert new plans
      const plans = await db
        .insert(SubscriptionPlanSchema)
        .values(
          plansData.map((plan) => ({
            name: plan.name,
            displayName: plan.displayName,
            description: plan.description,
            priceNgn: plan.priceNgn,
            priceUsd: plan.priceUsd,
            interval: plan.interval,
            features: plan.features,
            limits: plan.limits,
            isActive: true,
          }))
        )
        .returning();

      console.log(`✅ Created ${plans.length} subscription plans`);
    }

    // Display summary
    const allPlans = await db
      .select()
      .from(SubscriptionPlanSchema)
      .where(eq(SubscriptionPlanSchema.isActive, true));

    console.log("\n📊 Active Subscription Plans:");
    for (const plan of allPlans) {
      console.log(`   ${plan.name} (${plan.displayName})`);
      console.log(`     Price: ₦${(plan.priceNgn / 100).toLocaleString()}/month`);
      console.log(`     Features: ${plan.features.length} features`);
    }

    console.log("\n✨ Subscription plans seeding complete!");
    return true;
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    return false;
  }
}

// Run seeding
seedSubscriptionPlans().then((success) => {
  process.exit(success ? 0 : 1);
});
