CREATE TABLE "university_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"seat_limit" integer NOT NULL,
	"price_per_seat_ngn" integer NOT NULL,
	"interval" varchar DEFAULT 'monthly' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"paystack_reference" text,
	"amount_paid_ngn" integer,
	"last_payment_date" timestamp,
	"granted_by" uuid,
	"notes" text,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "university_subscription" ADD CONSTRAINT "university_subscription_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_subscription" ADD CONSTRAINT "university_subscription_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "university_subscription_university_idx" ON "university_subscription" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "university_subscription_status_idx" ON "university_subscription" USING btree ("status");