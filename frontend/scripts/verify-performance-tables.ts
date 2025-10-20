import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function verifyTables() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    console.log("🔍 Checking for performance tracking tables...\n");
    
    const result = await pool.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('performance_history', 'concept_mastery', 'study_sessions', 'grade_predictions')
      ORDER BY table_name;
    `);

    if (result.rows.length === 4) {
      console.log("✅ All 4 performance tracking tables exist!\n");
      result.rows.forEach((row: any) => {
        console.log(`  ✓ ${row.table_name} (${row.column_count} columns)`);
      });
      
      console.log("\n🎉 Database is ready for testing!");
      console.log("\nYou can now:");
      console.log("  1. Run the dev server: pnpm dev");
      console.log("  2. Visit: http://localhost:3000/student/dashboard");
      console.log("\n⚠️  Note: You'll need to be logged in as a student");
      
    } else {
      console.log(`❌ Only ${result.rows.length}/4 tables found:`);
      result.rows.forEach((row: any) => console.log(`  - ${row.table_name}`));
      
      const missing = ['performance_history', 'concept_mastery', 'study_sessions', 'grade_predictions']
        .filter(t => !result.rows.find((r: any) => r.table_name === t));
      
      console.log("\nMissing tables:");
      missing.forEach(t => console.log(`  - ${t}`));
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyTables();
