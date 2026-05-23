CREATE TYPE "public"."flashcard_last_rating_enum" AS ENUM('again', 'good');--> statement-breakpoint
CREATE TABLE "flashcard_deck" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"week_number" integer,
	"title" text NOT NULL,
	"source_material_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"card_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flashcard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"last_reviewed_at" timestamp,
	"next_due_at" timestamp,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"lapse_count" integer DEFAULT 0 NOT NULL,
	"last_rating" "flashcard_last_rating_enum",
	"ease_factor" real DEFAULT 2.5 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "flashcard_deck" ADD CONSTRAINT "flashcard_deck_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard_deck" ADD CONSTRAINT "flashcard_deck_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcard" ADD CONSTRAINT "flashcard_deck_id_flashcard_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."flashcard_deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flashcard_deck_student_idx" ON "flashcard_deck" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "flashcard_deck_course_idx" ON "flashcard_deck" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "flashcard_deck_student_course_idx" ON "flashcard_deck" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "flashcard_deck_idx" ON "flashcard" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "flashcard_due_idx" ON "flashcard" USING btree ("next_due_at");