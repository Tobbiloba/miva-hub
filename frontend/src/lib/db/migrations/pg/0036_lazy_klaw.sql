ALTER TABLE "faculty" ALTER COLUMN "office_hours" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "faculty" ALTER COLUMN "office_hours" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "faculty" ADD COLUMN "bio" text;