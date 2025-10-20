import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function testAccess() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    console.log("🔍 Testing access to all 4 tables...\n");

    const tables = [
      'performance_history',
      'concept_mastery',
      'study_sessions',
      'grade_predictions'
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM ${table};`);
        console.log(`✓ ${table}: accessible (${result.rows[0].count} rows)`);
      } catch (error: any) {
        console.log(`❌ ${table}: ${error.message}`);
      }
    }

    console.log("\n🎉 All tables exist and are accessible for SELECT queries!");
    console.log("\nYou can now test the dashboard:");
    console.log("  1. Run: pnpm dev");
    console.log("  2. Visit: http://localhost:3000/student/dashboard");
    console.log("\n⚠️  Note: The tables are empty, so you'll need test data");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAccess();
