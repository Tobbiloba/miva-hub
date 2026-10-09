ALTER TABLE "flashcard_deck" ALTER COLUMN "course_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "flashcard_deck" ADD COLUMN "chat_source" text;--> statement-breakpoint
CREATE UNIQUE INDEX "flashcard_deck_student_chat_source_idx" ON "flashcard_deck" USING btree ("student_id","chat_source");