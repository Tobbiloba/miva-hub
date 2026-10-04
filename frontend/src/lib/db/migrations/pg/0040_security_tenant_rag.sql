CREATE TABLE "extension_token" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"last_used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "extension_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
-- material_chunk may pre-exist on databases where scripts/rag/material_chunk.sql
-- was run by hand (no owner column, no FKs).
CREATE TABLE IF NOT EXISTS "material_chunk" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"chunk_index" integer NOT NULL,
	"title" text,
	"material_type" text,
	"week_number" integer,
	"content" text NOT NULL,
	"embedding" vector(1536) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_chunk" ADD COLUMN IF NOT EXISTS "owner_user_id" uuid;--> statement-breakpoint
-- Drop chunks whose material/course is gone so the new FKs can be added.
DELETE FROM "material_chunk" mc WHERE NOT EXISTS (SELECT 1 FROM "course_material" m WHERE m.id = mc.material_id);--> statement-breakpoint
DELETE FROM "material_chunk" mc WHERE NOT EXISTS (SELECT 1 FROM "course" c WHERE c.id = mc.course_id);--> statement-breakpoint
CREATE TABLE "rate_limit_bucket" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhook_event" DROP CONSTRAINT IF EXISTS "webhook_event_paystack_event_id_unique";--> statement-breakpoint
ALTER TABLE "announcement" ADD COLUMN "university_id" uuid;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "university_id" uuid;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "shareable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "rag_index_status" varchar;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "rag_indexed_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "rag_index_error" text;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD COLUMN "owner_user_id" uuid;--> statement-breakpoint
ALTER TABLE "report_config" ADD COLUMN "university_id" uuid;--> statement-breakpoint
ALTER TABLE "webhook_event" ADD COLUMN "event_key" text;--> statement-breakpoint
ALTER TABLE "extension_token" ADD CONSTRAINT "extension_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_material_id_course_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."course_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_chunk" ADD CONSTRAINT "material_chunk_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extension_token_user_idx" ON "extension_token" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_chunk_course_idx" ON "material_chunk" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_chunk_material_idx" ON "material_chunk" USING btree ("material_id");--> statement-breakpoint
CREATE INDEX "material_chunk_owner_idx" ON "material_chunk" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "material_chunk_embedding_idx" ON "material_chunk" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingestion_job" ADD CONSTRAINT "ingestion_job_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_config" ADD CONSTRAINT "report_config_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_university_idx" ON "announcement" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "calendar_event_university_idx" ON "calendar_event" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "material_owner_idx" ON "course_material" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "material_rag_index_status_idx" ON "course_material" USING btree ("rag_index_status");--> statement-breakpoint
CREATE INDEX "report_university_idx" ON "report_config" USING btree ("university_id");--> statement-breakpoint
ALTER TABLE "webhook_event" ADD CONSTRAINT "webhook_event_event_key_unique" UNIQUE("event_key");--> statement-breakpoint
-- Backfill tenant scope from the creating user's university (NULL stays platform-wide).
UPDATE "announcement" a SET "university_id" = u."university_id" FROM "user" u WHERE u.id = a."created_by_id" AND a."university_id" IS NULL;--> statement-breakpoint
UPDATE "calendar_event" e SET "university_id" = u."university_id" FROM "user" u WHERE u.id = e."created_by_id" AND e."university_id" IS NULL;--> statement-breakpoint
UPDATE "report_config" r SET "university_id" = u."university_id" FROM "user" u WHERE u.id = r."created_by_id" AND r."university_id" IS NULL;--> statement-breakpoint
-- Materials that already have chunks are indexed; the backfill script picks up the rest.
UPDATE "course_material" m SET "rag_index_status" = 'indexed', "rag_indexed_at" = now() WHERE EXISTS (SELECT 1 FROM "material_chunk" c WHERE c.material_id = m.id);
