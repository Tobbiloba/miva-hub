import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function createTables() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  });

  try {
    console.log("🚀 Creating performance tracking tables...\n");

    // Create tables one by one without constraints first
    console.log("Creating performance_history table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS performance_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        student_id uuid NOT NULL,
        course_id uuid NOT NULL,
        week_number integer NOT NULL,
        average_grade numeric(5, 2),
        assignments_completed integer DEFAULT 0,
        assignments_total integer DEFAULT 0,
        study_time_minutes integer DEFAULT 0,
        recorded_at timestamp DEFAULT CURRENT_TIMESTAMP,
        semester text NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT performance_history_unique UNIQUE(student_id, course_id, week_number, semester)
      );
    `);
    console.log("✓ performance_history created");

    console.log("Creating concept_mastery table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS concept_mastery (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        student_id uuid NOT NULL,
        course_id uuid NOT NULL,
        concept_name text NOT NULL,
        mastery_level numeric(3, 2) DEFAULT 0.0,
        correct_attempts integer DEFAULT 0,
        total_attempts integer DEFAULT 0,
        last_practiced_at timestamp,
        first_learned_at timestamp DEFAULT CURRENT_TIMESTAMP,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        CONSTRAINT concept_mastery_unique UNIQUE(student_id, course_id, concept_name)
      );
    `);
    console.log("✓ concept_mastery created");

    console.log("Creating study_sessions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS study_sessions (
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
    console.log("✓ study_sessions created");

    console.log("Creating grade_predictions table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grade_predictions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        student_id uuid NOT NULL,
        course_id uuid NOT NULL,
        predicted_final_grade numeric(5, 2),
        confidence_level numeric(3, 2),
        prediction_factors json,
        algorithm_version text DEFAULT '1.0',
        predicted_at timestamp DEFAULT CURRENT_TIMESTAMP,
        semester text NOT NULL,
        created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);
    console.log("✓ grade_predictions created");

    console.log("\n📊 Creating indexes...");
    await pool.query(`
      CREATE INDEX IF NOT EXISTS perf_history_student_idx ON performance_history(student_id, recorded_at);
      CREATE INDEX IF NOT EXISTS perf_history_course_idx ON performance_history(course_id, semester);
      CREATE INDEX IF NOT EXISTS perf_history_week_idx ON performance_history(week_number);
      
      CREATE INDEX IF NOT EXISTS concept_mastery_student_idx ON concept_mastery(student_id, course_id);
      CREATE INDEX IF NOT EXISTS concept_mastery_level_idx ON concept_mastery(mastery_level);
      
      CREATE INDEX IF NOT EXISTS study_sessions_student_idx ON study_sessions(student_id, started_at);
      CREATE INDEX IF NOT EXISTS study_sessions_course_idx ON study_sessions(course_id, started_at);
      CREATE INDEX IF NOT EXISTS study_sessions_type_idx ON study_sessions(session_type);
      
      CREATE INDEX IF NOT EXISTS grade_predictions_student_idx ON grade_predictions(student_id, semester, predicted_at);
      CREATE INDEX IF NOT EXISTS grade_predictions_course_idx ON grade_predictions(course_id, semester);
    `);
    console.log("✓ All indexes created");

    console.log("\n🎉 SUCCESS! All tables created!\n");
    console.log("Next steps:");
    console.log("  1. Run: pnpm dev");
    console.log("  2. Visit: http://localhost:3000/student/dashboard");
    console.log("  3. Login as a student to test");

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.detail) console.error("Detail:", error.detail);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();
