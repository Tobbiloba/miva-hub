import "dotenv/config";
import pg from "pg";

async function main() {
  const client = new pg.Client(process.env.POSTGRES_URL);
  await client.connect();

  const statements = [
    `CREATE TYPE "public"."ingestion_job_status_enum" AS ENUM('queued', 'downloading', 'completed', 'failed')`,
    `CREATE TYPE "public"."ingestion_source_enum" AS ENUM('manual', 'volunteer_extension', 'scraper', 'seed')`,
    `CREATE TABLE IF NOT EXISTS "ingestion_job" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "volunteer_id" uuid NOT NULL,
      "source_url" text NOT NULL,
      "course_id" uuid NOT NULL,
      "week_number" integer,
      "lesson_title" text NOT NULL,
      "session_id" uuid,
      "content_type" varchar NOT NULL,
      "payload" json NOT NULL,
      "status" "ingestion_job_status_enum" DEFAULT 'queued' NOT NULL,
      "course_material_id" uuid,
      "error_message" text,
      "completed_at" timestamp,
      "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`,
    `ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "is_published" boolean DEFAULT true NOT NULL`,
    `ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "session_id" uuid`,
    `ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "ingestion_source" "ingestion_source_enum" DEFAULT 'manual' NOT NULL`,
    `ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "volunteer_id" uuid`,
    `ALTER TABLE "course_material" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp`,
    `ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_volunteer" boolean DEFAULT false NOT NULL`,
    // FKs for ingestion_job
    `ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`,
    `ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action`,
    `ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_session"("id") ON DELETE set null ON UPDATE no action`,
    `ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_course_material_id_course_material_id_fk" FOREIGN KEY ("course_material_id") REFERENCES "public"."course_material"("id") ON DELETE set null ON UPDATE no action`,
    // Indexes for ingestion_job
    `CREATE INDEX IF NOT EXISTS "ingestion_job_volunteer_idx" ON "ingestion_job" USING btree ("volunteer_id")`,
    `CREATE INDEX IF NOT EXISTS "ingestion_job_course_idx" ON "ingestion_job" USING btree ("course_id")`,
    `CREATE INDEX IF NOT EXISTS "ingestion_job_status_idx" ON "ingestion_job" USING btree ("status")`,
    `CREATE INDEX IF NOT EXISTS "ingestion_job_created_idx" ON "ingestion_job" USING btree ("created_at")`,
    // FKs for course_material new columns
    `ALTER TABLE "course_material" ADD CONSTRAINT "course_material_session_id_academic_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_session"("id") ON DELETE set null ON UPDATE no action`,
    `ALTER TABLE "course_material" ADD CONSTRAINT "course_material_volunteer_id_user_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action`,
    // Indexes for course_material new columns
    `CREATE INDEX IF NOT EXISTS "material_session_idx" ON "course_material" USING btree ("session_id")`,
    `CREATE INDEX IF NOT EXISTS "material_ingestion_source_idx" ON "course_material" USING btree ("ingestion_source")`,
    `CREATE INDEX IF NOT EXISTS "material_volunteer_idx" ON "course_material" USING btree ("volunteer_id")`,
  ];

  let ok = 0;
  let skip = 0;
  for (const sql of statements) {
    try {
      await client.query(sql);
      ok++;
      console.log("  OK:", sql.slice(0, 80));
    } catch (e: any) {
      if (
        e.message.includes("already exists") ||
        e.message.includes("duplicate")
      ) {
        skip++;
        console.log("SKIP:", sql.slice(0, 80));
      } else {
        console.error("FAIL:", sql.slice(0, 80), "→", e.message);
      }
    }
  }
  console.log(`\nDone: ${ok} applied, ${skip} skipped (already exist)`);
  await client.end();
}

main().catch(console.error);
