CREATE TABLE "siwes_log_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_date" date NOT NULL,
	"present" boolean DEFAULT true NOT NULL,
	"absence_reason" text,
	"raw_note" text DEFAULT '' NOT NULL,
	"formatted_entry" text DEFAULT '' NOT NULL,
	"skills" json DEFAULT '[]'::json NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siwes_month" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"summary" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siwes_placement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"university_id" uuid,
	"phase" varchar NOT NULL,
	"organization" text NOT NULL,
	"address" text,
	"organization_size" varchar,
	"products_jobs" json DEFAULT '[]'::json NOT NULL,
	"structure_description" text,
	"department_section" text,
	"industry_supervisor_name" text,
	"industry_supervisor_email" text,
	"school_supervisor" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "siwes_week" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"placement_id" uuid NOT NULL,
	"week_ending" date NOT NULL,
	"general_description" text,
	"department_section" text,
	"project_job" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "siwes_log_entry" ADD CONSTRAINT "siwes_log_entry_placement_id_siwes_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."siwes_placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siwes_log_entry" ADD CONSTRAINT "siwes_log_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siwes_month" ADD CONSTRAINT "siwes_month_placement_id_siwes_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."siwes_placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siwes_placement" ADD CONSTRAINT "siwes_placement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siwes_placement" ADD CONSTRAINT "siwes_placement_university_id_university_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."university"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siwes_week" ADD CONSTRAINT "siwes_week_placement_id_siwes_placement_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."siwes_placement"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "siwes_log_entry_placement_date_idx" ON "siwes_log_entry" USING btree ("placement_id","entry_date");--> statement-breakpoint
CREATE INDEX "siwes_log_entry_user_date_idx" ON "siwes_log_entry" USING btree ("user_id","entry_date");--> statement-breakpoint
CREATE UNIQUE INDEX "siwes_month_placement_month_idx" ON "siwes_month" USING btree ("placement_id","month");--> statement-breakpoint
CREATE UNIQUE INDEX "siwes_placement_user_phase_idx" ON "siwes_placement" USING btree ("user_id","phase");--> statement-breakpoint
CREATE UNIQUE INDEX "siwes_week_placement_week_idx" ON "siwes_week" USING btree ("placement_id","week_ending");