CREATE TABLE "calendar_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"event_type" varchar NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" text,
	"end_time" text,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"location" text,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"status" varchar DEFAULT 'scheduled' NOT NULL,
	"affected_users" varchar DEFAULT 'all' NOT NULL,
	"course_id" uuid,
	"department_id" uuid,
	"created_by_id" uuid NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_pattern" json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_mastery" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"concept_name" text NOT NULL,
	"mastery_level" numeric(3, 2) DEFAULT '0.0',
	"correct_attempts" integer DEFAULT 0,
	"total_attempts" integer DEFAULT 0,
	"last_practiced_at" timestamp,
	"first_learned_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "concept_mastery_student_id_course_id_concept_name_unique" UNIQUE("student_id","course_id","concept_name")
);
--> statement-breakpoint
CREATE TABLE "grade_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"predicted_final_grade" numeric(5, 2),
	"confidence_level" numeric(3, 2),
	"prediction_factors" json,
	"algorithm_version" text DEFAULT '1.0',
	"predicted_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"semester" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"paystack_reference" text NOT NULL,
	"paystack_transaction_id" text,
	"paystack_access_code" text,
	"amount_ngn" integer NOT NULL,
	"currency" text DEFAULT 'NGN',
	"status" text NOT NULL,
	"payment_method" text,
	"customer_email" text,
	"customer_name" text,
	"description" text,
	"metadata" json DEFAULT '{}'::json,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "payment_transaction_paystack_reference_unique" UNIQUE("paystack_reference")
);
--> statement-breakpoint
CREATE TABLE "performance_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"week_number" integer NOT NULL,
	"average_grade" numeric(5, 2),
	"assignments_completed" integer DEFAULT 0,
	"assignments_total" integer DEFAULT 0,
	"study_time_minutes" integer DEFAULT 0,
	"recorded_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"semester" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "performance_history_student_id_course_id_week_number_semester_unique" UNIQUE("student_id","course_id","week_number","semester")
);
--> statement-breakpoint
CREATE TABLE "report_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"report_type" varchar DEFAULT 'custom' NOT NULL,
	"format" varchar DEFAULT 'pdf' NOT NULL,
	"schedule" varchar DEFAULT 'manual' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"query_template" text,
	"parameters" json DEFAULT '{}'::json,
	"recipients" json DEFAULT '[]'::json,
	"created_by_id" uuid NOT NULL,
	"last_generated" timestamp,
	"next_scheduled" timestamp,
	"generation_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_instance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_config_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text,
	"file_size" integer,
	"format" varchar NOT NULL,
	"generated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"generated_by_id" uuid NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid,
	"session_type" varchar NOT NULL,
	"duration_minutes" integer NOT NULL,
	"activity_data" json,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_change_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"change_type" text NOT NULL,
	"from_plan_id" uuid,
	"to_plan_id" uuid,
	"reason" text,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"price_ngn" integer NOT NULL,
	"price_usd" integer,
	"interval" text DEFAULT 'monthly' NOT NULL,
	"features" json DEFAULT '[]'::json NOT NULL,
	"limits" json DEFAULT '{}'::json NOT NULL,
	"paystack_plan_code" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "subscription_plan_name_unique" UNIQUE("name"),
	CONSTRAINT "subscription_plan_paystack_plan_code_unique" UNIQUE("paystack_plan_code")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar(50) NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"value_type" varchar DEFAULT 'string' NOT NULL,
	"description" text,
	"is_editable" boolean DEFAULT true NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "system_settings_category_key_unique" UNIQUE("category","key")
);
--> statement-breakpoint
CREATE TABLE "usage_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"usage_type" text NOT NULL,
	"period_type" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"current_count" integer DEFAULT 0,
	"limit_count" integer,
	"last_reset_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"paystack_subscription_code" text,
	"paystack_customer_code" text,
	"paystack_email_token" text,
	"paystack_authorization_code" text,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false,
	"cancelled_at" timestamp,
	"next_payment_date" timestamp,
	"last_payment_date" timestamp,
	"amount_paid_ngn" integer,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" json DEFAULT '{}'::json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_subscription_paystack_subscription_code_unique" UNIQUE("paystack_subscription_code")
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"paystack_event_id" text,
	"payload" json NOT NULL,
	"signature" text,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "webhook_event_paystack_event_id_unique" UNIQUE("paystack_event_id")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "paystack_customer_code" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "subscription_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "current_plan" text DEFAULT 'FREE';--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_mastery" ADD CONSTRAINT "concept_mastery_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_predictions" ADD CONSTRAINT "grade_predictions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_predictions" ADD CONSTRAINT "grade_predictions_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transaction" ADD CONSTRAINT "payment_transaction_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_history" ADD CONSTRAINT "performance_history_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_history" ADD CONSTRAINT "performance_history_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_config" ADD CONSTRAINT "report_config_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instance" ADD CONSTRAINT "report_instance_report_config_id_report_config_id_fk" FOREIGN KEY ("report_config_id") REFERENCES "public"."report_config"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_instance" ADD CONSTRAINT "report_instance_generated_by_id_user_id_fk" FOREIGN KEY ("generated_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_log" ADD CONSTRAINT "subscription_change_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_log" ADD CONSTRAINT "subscription_change_log_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_log" ADD CONSTRAINT "subscription_change_log_from_plan_id_subscription_plan_id_fk" FOREIGN KEY ("from_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_change_log" ADD CONSTRAINT "subscription_change_log_to_plan_id_subscription_plan_id_fk" FOREIGN KEY ("to_plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_subscription_id_user_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."user_subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_plan_id_subscription_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_event_type_idx" ON "calendar_event" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "calendar_event_date_idx" ON "calendar_event" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "calendar_event_priority_idx" ON "calendar_event" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "calendar_event_status_idx" ON "calendar_event" USING btree ("status");--> statement-breakpoint
CREATE INDEX "calendar_event_users_idx" ON "calendar_event" USING btree ("affected_users");--> statement-breakpoint
CREATE INDEX "calendar_event_course_idx" ON "calendar_event" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "calendar_event_department_idx" ON "calendar_event" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "concept_mastery_student_idx" ON "concept_mastery" USING btree ("student_id","course_id");--> statement-breakpoint
CREATE INDEX "concept_mastery_level_idx" ON "concept_mastery" USING btree ("mastery_level");--> statement-breakpoint
CREATE INDEX "grade_predictions_student_idx" ON "grade_predictions" USING btree ("student_id","semester","predicted_at");--> statement-breakpoint
CREATE INDEX "grade_predictions_course_idx" ON "grade_predictions" USING btree ("course_id","semester");--> statement-breakpoint
CREATE INDEX "perf_history_student_idx" ON "performance_history" USING btree ("student_id","recorded_at");--> statement-breakpoint
CREATE INDEX "perf_history_course_idx" ON "performance_history" USING btree ("course_id","semester");--> statement-breakpoint
CREATE INDEX "perf_history_week_idx" ON "performance_history" USING btree ("week_number");--> statement-breakpoint
CREATE INDEX "report_category_idx" ON "report_config" USING btree ("category");--> statement-breakpoint
CREATE INDEX "report_type_idx" ON "report_config" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "report_schedule_idx" ON "report_config" USING btree ("schedule");--> statement-breakpoint
CREATE INDEX "report_active_idx" ON "report_config" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "report_next_scheduled_idx" ON "report_config" USING btree ("next_scheduled");--> statement-breakpoint
CREATE INDEX "report_instance_config_idx" ON "report_instance" USING btree ("report_config_id");--> statement-breakpoint
CREATE INDEX "report_instance_generated_idx" ON "report_instance" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "report_instance_expires_idx" ON "report_instance" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "study_sessions_student_idx" ON "study_sessions" USING btree ("student_id","started_at");--> statement-breakpoint
CREATE INDEX "study_sessions_course_idx" ON "study_sessions" USING btree ("course_id","started_at");--> statement-breakpoint
CREATE INDEX "study_sessions_type_idx" ON "study_sessions" USING btree ("session_type");--> statement-breakpoint
CREATE INDEX "settings_category_idx" ON "system_settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "settings_key_idx" ON "system_settings" USING btree ("key");