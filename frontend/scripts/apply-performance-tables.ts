import { readFileSync } from "fs";
import { join } from "path";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function applyTables() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    console.log("📦 Reading SQL file...");
    const sql = readFileSync(
      join(process.cwd(), "scripts/create-performance-tables.sql"),
      "utf-8"
    );

    console.log("🚀 Executing SQL...");
    const result = await pool.query(sql);

    console.log("\n✅ Tables created successfully!");
    console.log("\nVerification:");
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('performance_history', 'concept_mastery', 'study_sessions', 'grade_predictions')
      ORDER BY table_name;
    `);

    tables.rows.forEach((row: any) => {
      console.log(`  ✓ ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error applying tables:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyTables();
