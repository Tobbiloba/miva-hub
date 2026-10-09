CREATE TABLE "student_deadline" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"title" text NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"source" varchar NOT NULL,
	"material_id" uuid,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_material" ADD COLUMN "due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_deadline" ADD CONSTRAINT "student_deadline_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_deadline" ADD CONSTRAINT "student_deadline_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_deadline" ADD CONSTRAINT "student_deadline_material_id_course_material_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."course_material"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_deadline_student_due_idx" ON "student_deadline" USING btree ("student_id","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "student_deadline_student_material_idx" ON "student_deadline" USING btree ("student_id","material_id");--> statement-breakpoint
-- Backfill captured assignment/quiz deadlines whose LMS date was an ISO
-- datetime (the <time datetime> attribute). Free-text dates are parsed by the
-- app at capture time; older free-text rows stay without a deadline.
UPDATE "course_material" SET "due_at" = ("external_metadata"->>'due_date')::timestamptz
WHERE "due_at" IS NULL
  AND "material_type" IN ('assignment_external', 'quiz')
  AND "external_metadata"->>'due_date' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}';
