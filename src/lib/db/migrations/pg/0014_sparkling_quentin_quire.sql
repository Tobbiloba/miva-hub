CREATE TABLE "academic_calendar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"semester" text NOT NULL,
	"academic_year" text NOT NULL,
	"semester_name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"registration_start_date" date,
	"registration_end_date" date,
	"add_drop_deadline" date,
	"midterm_week" integer,
	"finals_start_date" date,
	"finals_end_date" date,
	"graduation_date" date,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "academic_calendar_semester_unique" UNIQUE("semester")
);
--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"course_id" uuid,
	"department_id" uuid,
	"created_by_id" uuid NOT NULL,
	"target_audience" varchar DEFAULT 'all' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"instructions" text,
	"assignment_type" varchar NOT NULL,
	"total_points" numeric(6, 2) NOT NULL,
	"due_date" timestamp NOT NULL,
	"submission_type" varchar DEFAULT 'file_upload' NOT NULL,
	"allow_late_submission" boolean DEFAULT false NOT NULL,
	"late_submission_penalty" numeric(5, 2),
	"week_number" integer,
	"module_number" integer,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_submission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"submission_text" text,
	"file_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"grade" numeric(6, 2),
	"feedback" text,
	"is_late_submission" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"graded_at" timestamp,
	"graded_by_id" uuid,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "assignment_submission_assignment_id_student_id_unique" UNIQUE("assignment_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"class_date" date NOT NULL,
	"status" varchar NOT NULL,
	"marked_by_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "attendance_enrollment_id_class_date_unique" UNIQUE("enrollment_id","class_date")
);
--> statement-breakpoint
CREATE TABLE "class_schedule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"semester" text NOT NULL,
	"day_of_week" varchar NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"room_location" text,
	"building_name" text,
	"class_type" varchar DEFAULT 'lecture' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_instructor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"faculty_id" uuid NOT NULL,
	"semester" text NOT NULL,
	"role" varchar DEFAULT 'primary' NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_instructor_course_id_faculty_id_semester_unique" UNIQUE("course_id","faculty_id","semester")
);
--> statement-breakpoint
CREATE TABLE "course_material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"material_type" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"content_url" text,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"week_number" integer,
	"module_number" integer,
	"is_public" boolean DEFAULT true NOT NULL,
	"uploaded_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_prerequisite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"prerequisite_course_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_prerequisite_course_id_prerequisite_course_id_unique" UNIQUE("course_id","prerequisite_course_id")
);
--> statement-breakpoint
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"credits" integer DEFAULT 3 NOT NULL,
	"department_id" uuid NOT NULL,
	"level" varchar DEFAULT 'undergraduate' NOT NULL,
	"semester_offered" varchar DEFAULT 'both' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "course_course_code_unique" UNIQUE("course_code")
);
--> statement-breakpoint
CREATE TABLE "department" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"faculty_head_id" uuid,
	"contact_email" text,
	"contact_phone" text,
	"office_location" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "department_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "faculty" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"employee_id" text NOT NULL,
	"department_id" uuid NOT NULL,
	"position" varchar NOT NULL,
	"specializations" json DEFAULT '[]'::json,
	"office_location" text,
	"office_hours" json DEFAULT '[]'::json,
	"contact_phone" text,
	"research_interests" text,
	"qualifications" json DEFAULT '[]'::json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "faculty_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "faculty_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "student_enrollment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"semester" text NOT NULL,
	"academic_year" text NOT NULL,
	"enrollment_date" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"status" varchar DEFAULT 'enrolled' NOT NULL,
	"final_grade" text,
	"grade_points" numeric(3, 2),
	"attendance_percentage" numeric(5, 2),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "student_enrollment_student_id_course_id_semester_unique" UNIQUE("student_id","course_id","semester")
);
--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_assignment_id_assignment_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_graded_by_id_user_id_fk" FOREIGN KEY ("graded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_enrollment_id_student_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."student_enrollment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_id_user_id_fk" FOREIGN KEY ("marked_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_schedule" ADD CONSTRAINT "class_schedule_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_instructor" ADD CONSTRAINT "course_instructor_faculty_id_faculty_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculty"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_material" ADD CONSTRAINT "course_material_uploaded_by_id_user_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prerequisite" ADD CONSTRAINT "course_prerequisite_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_prerequisite" ADD CONSTRAINT "course_prerequisite_prerequisite_course_id_course_id_fk" FOREIGN KEY ("prerequisite_course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department" ADD CONSTRAINT "department_faculty_head_id_user_id_fk" FOREIGN KEY ("faculty_head_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faculty" ADD CONSTRAINT "faculty_department_id_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."department"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_enrollment" ADD CONSTRAINT "student_enrollment_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_semester_idx" ON "academic_calendar" USING btree ("semester");--> statement-breakpoint
CREATE INDEX "calendar_academic_year_idx" ON "academic_calendar" USING btree ("academic_year");--> statement-breakpoint
CREATE INDEX "calendar_active_idx" ON "academic_calendar" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "announcement_course_idx" ON "announcement" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "announcement_department_idx" ON "announcement" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "announcement_target_idx" ON "announcement" USING btree ("target_audience");--> statement-breakpoint
CREATE INDEX "announcement_priority_idx" ON "announcement" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "announcement_active_idx" ON "announcement" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "announcement_created_by_idx" ON "announcement" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "assignment_course_idx" ON "assignment" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "assignment_due_date_idx" ON "assignment" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "assignment_type_idx" ON "assignment" USING btree ("assignment_type");--> statement-breakpoint
CREATE INDEX "assignment_week_idx" ON "assignment" USING btree ("week_number");--> statement-breakpoint
CREATE INDEX "assignment_published_idx" ON "assignment" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "submission_assignment_idx" ON "assignment_submission" USING btree ("assignment_id");--> statement-breakpoint
CREATE INDEX "submission_student_idx" ON "assignment_submission" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "submission_date_idx" ON "assignment_submission" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "submission_graded_idx" ON "assignment_submission" USING btree ("graded_at");--> statement-breakpoint
CREATE INDEX "attendance_enrollment_idx" ON "attendance" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("class_date");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "schedule_course_idx" ON "class_schedule" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "schedule_day_idx" ON "class_schedule" USING btree ("day_of_week");--> statement-breakpoint
CREATE INDEX "schedule_semester_idx" ON "class_schedule" USING btree ("semester");--> statement-breakpoint
CREATE INDEX "schedule_room_idx" ON "class_schedule" USING btree ("room_location");--> statement-breakpoint
CREATE INDEX "instructor_course_idx" ON "course_instructor" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "instructor_faculty_idx" ON "course_instructor" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "instructor_semester_idx" ON "course_instructor" USING btree ("semester");--> statement-breakpoint
CREATE INDEX "material_course_idx" ON "course_material" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "material_type_idx" ON "course_material" USING btree ("material_type");--> statement-breakpoint
CREATE INDEX "material_week_idx" ON "course_material" USING btree ("week_number");--> statement-breakpoint
CREATE INDEX "material_uploaded_by_idx" ON "course_material" USING btree ("uploaded_by_id");--> statement-breakpoint
CREATE INDEX "prerequisite_course_idx" ON "course_prerequisite" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_department_idx" ON "course" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "course_code_idx" ON "course" USING btree ("course_code");--> statement-breakpoint
CREATE INDEX "course_level_idx" ON "course" USING btree ("level");--> statement-breakpoint
CREATE INDEX "faculty_user_idx" ON "faculty" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "faculty_department_idx" ON "faculty" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "faculty_position_idx" ON "faculty" USING btree ("position");--> statement-breakpoint
CREATE INDEX "enrollment_student_idx" ON "student_enrollment" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollment_course_idx" ON "student_enrollment" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollment_semester_idx" ON "student_enrollment" USING btree ("semester");--> statement-breakpoint
CREATE INDEX "enrollment_status_idx" ON "student_enrollment" USING btree ("status");