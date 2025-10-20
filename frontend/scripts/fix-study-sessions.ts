import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function fixStudySessions() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    console.log("🔍 Checking study_sessions table...\n");
    
    // Check if it exists in any schema
    const checkResult = await pool.query(`
      SELECT schemaname, tablename, tableowner 
      FROM pg_tables 
      WHERE tablename = 'study_sessions';
    `);

    if (checkResult.rows.length > 0) {
      console.log("📋 study_sessions table found:");
      checkResult.rows.forEach((row: any) => {
        console.log(`  Schema: ${row.schemaname}, Owner: ${row.tableowner}`);
      });
      
      console.log("\n🔧 Attempting to drop and recreate...");
      await pool.query(`DROP TABLE IF EXISTS study_sessions CASCADE;`);
      console.log("✓ Dropped existing table");
    }

    console.log("Creating study_sessions table in public schema...");
    await pool.query(`
      CREATE TABLE public.study_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        student_id uuid NOT NULL,
        course_id uuid,
        session_type varchar NOT NULL,
        duration_minutes integer NOT NULL,
        activity_data json,
        started_at timestamp NOT NULL,
        ended_at timestamp NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("✓ study_sessions created successfully");

    // Create indexes
    console.log("Creating indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS study_sessions_student_idx ON public.study_sessions(student_id, started_at);
      CREATE INDEX IF NOT EXISTS study_sessions_course_idx ON public.study_sessions(course_id, started_at);
      CREATE INDEX IF NOT EXISTS study_sessions_type_idx ON public.study_sessions(session_type);
    `);
    console.log("✓ Indexes created");

    console.log("\n🎉 SUCCESS! study_sessions table is ready!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.detail) console.error("Detail:", error.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixStudySessions();
