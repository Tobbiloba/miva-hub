-- Create Performance Tracking Tables (Safe - uses IF NOT EXISTS)
-- Run this to create only the 4 new performance tables

CREATE TABLE IF NOT EXISTS performance_history (
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

CREATE TABLE IF NOT EXISTS concept_mastery (
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

CREATE TABLE IF NOT EXISTS study_sessions (
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

CREATE TABLE IF NOT EXISTS grade_predictions (
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

-- Add foreign key constraints only if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'performance_history_student_id_user_id_fk'
    ) THEN
        ALTER TABLE performance_history ADD CONSTRAINT "performance_history_student_id_user_id_fk" 
        FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'performance_history_course_id_course_id_fk'
    ) THEN
        ALTER TABLE performance_history ADD CONSTRAINT "performance_history_course_id_course_id_fk" 
        FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'concept_mastery_student_id_user_id_fk'
    ) THEN
        ALTER TABLE concept_mastery ADD CONSTRAINT "concept_mastery_student_id_user_id_fk" 
        FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'concept_mastery_course_id_course_id_fk'
    ) THEN
        ALTER TABLE concept_mastery ADD CONSTRAINT "concept_mastery_course_id_course_id_fk" 
        FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_student_id_user_id_fk'
    ) THEN
        ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_student_id_user_id_fk" 
        FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'study_sessions_course_id_course_id_fk'
    ) THEN
        ALTER TABLE study_sessions ADD CONSTRAINT "study_sessions_course_id_course_id_fk" 
        FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'grade_predictions_student_id_user_id_fk'
    ) THEN
        ALTER TABLE grade_predictions ADD CONSTRAINT "grade_predictions_student_id_user_id_fk" 
        FOREIGN KEY ("student_id") REFERENCES "user"("id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'grade_predictions_course_id_course_id_fk'
    ) THEN
        ALTER TABLE grade_predictions ADD CONSTRAINT "grade_predictions_course_id_course_id_fk" 
        FOREIGN KEY ("course_id") REFERENCES "course"("id") ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS "perf_history_student_idx" ON performance_history("student_id","recorded_at");
CREATE INDEX IF NOT EXISTS "perf_history_course_idx" ON performance_history("course_id","semester");
CREATE INDEX IF NOT EXISTS "perf_history_week_idx" ON performance_history("week_number");

CREATE INDEX IF NOT EXISTS "concept_mastery_student_idx" ON concept_mastery("student_id","course_id");
CREATE INDEX IF NOT EXISTS "concept_mastery_level_idx" ON concept_mastery("mastery_level");

CREATE INDEX IF NOT EXISTS "study_sessions_student_idx" ON study_sessions("student_id","started_at");
CREATE INDEX IF NOT EXISTS "study_sessions_course_idx" ON study_sessions("course_id","started_at");
CREATE INDEX IF NOT EXISTS "study_sessions_type_idx" ON study_sessions("session_type");

CREATE INDEX IF NOT EXISTS "grade_predictions_student_idx" ON grade_predictions("student_id","semester","predicted_at");
CREATE INDEX IF NOT EXISTS "grade_predictions_course_idx" ON grade_predictions("course_id","semester");

-- Verify tables were created
SELECT 
    'performance_history' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns 
WHERE table_name = 'performance_history'
UNION ALL
SELECT 
    'concept_mastery',
    COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'concept_mastery'
UNION ALL
SELECT 
    'study_sessions',
    COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'study_sessions'
UNION ALL
SELECT 
    'grade_predictions',
    COUNT(*)
FROM information_schema.columns 
WHERE table_name = 'grade_predictions';
