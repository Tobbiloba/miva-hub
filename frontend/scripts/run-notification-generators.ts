/**
 * Manual notification generator runner.
 * Usage: pnpm tsx scripts/run-notification-generators.ts
 *
 * Runs all 5 notification generators in sequence. Idempotent — safe to run
 * multiple times; won't create duplicate notifications.
 *
 * In Week 3 this gets wired to a cron / background worker.
 */

import "dotenv/config";

// Drizzle needs POSTGRES_URL
if (!process.env.POSTGRES_URL) {
  console.error("POSTGRES_URL not set");
  process.exit(1);
}

async function main() {
  console.log("=== Notification Generator Run ===");
  console.log(`Time: ${new Date().toISOString()}\n`);

  const { generateStreakMilestoneNotifications } = await import(
    "../src/lib/notifications/generators/streak-milestone"
  );
  const { generateStreakAtRiskNotifications } = await import(
    "../src/lib/notifications/generators/streak-at-risk"
  );
  const { generateCourseNeglectedNotifications } = await import(
    "../src/lib/notifications/generators/course-neglected"
  );
  const { generateFlashcardsDueNotifications } = await import(
    "../src/lib/notifications/generators/flashcards-due"
  );

  const generators = [
    { name: "streak_milestone", fn: generateStreakMilestoneNotifications },
    { name: "streak_at_risk", fn: generateStreakAtRiskNotifications },
    { name: "course_neglected", fn: generateCourseNeglectedNotifications },
    { name: "flashcards_due", fn: generateFlashcardsDueNotifications },
  ];

  let totalCreated = 0;

  for (const gen of generators) {
    try {
      const count = await gen.fn();
      console.log(`  ${gen.name}: ${count} notification(s) created`);
      totalCreated += count;
    } catch (error) {
      console.error(`  ${gen.name}: ERROR -`, error);
    }
  }

  console.log(`\nTotal: ${totalCreated} notification(s) created`);
  console.log("Done.");
  process.exit(0);
}

main();
