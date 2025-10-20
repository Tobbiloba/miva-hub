-- ================================================
-- Performance Tracking Tables for Phase 1
-- Creates 4 new tables for student analytics
-- ================================================

-- Performance History: Weekly aggregated performance per course
CREATE TABLE IF NOT EXISTS performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 16),
    average_grade DECIMAL(5,2) CHECK (average_grade >= 0 AND average_grade <= 100),
    assignments_completed INTEGER DEFAULT 0 CHECK (assignments_completed >= 0),
    assignments_total INTEGER DEFAULT 0 CHECK (assignments_total >= 0),
    study_time_minutes INTEGER DEFAULT 0 CHECK (study_time_minutes >= 0),
    recorded_at TIMESTAMP DEFAULT NOW(),
    semester TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(student_id, course_id, week_number, semester)
);

CREATE INDEX idx_perf_history_student ON performance_history(student_id, recorded_at DESC);
CREATE INDEX idx_perf_history_course ON performance_history(course_id, semester);
CREATE INDEX idx_perf_history_week ON performance_history(week_number);

COMMENT ON TABLE performance_history IS 'Weekly aggregated student performance per course';
COMMENT ON COLUMN performance_history.week_number IS 'Week number in semester (1-16)';
COMMENT ON COLUMN performance_history.study_time_minutes IS 'Total study time in minutes for this week';

-- Concept Mastery: Track student understanding of each concept
CREATE TABLE IF NOT EXISTS concept_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    mastery_level DECIMAL(3,2) DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
    correct_attempts INTEGER DEFAULT 0 CHECK (correct_attempts >= 0),
    total_attempts INTEGER DEFAULT 0 CHECK (total_attempts >= 0),
    last_practiced_at TIMESTAMP,
    first_learned_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(student_id, course_id, concept_name)
);

CREATE INDEX idx_concept_mastery_student ON concept_mastery(student_id, course_id);
CREATE INDEX idx_concept_mastery_level ON concept_mastery(mastery_level);
CREATE INDEX idx_concept_mastery_weak ON concept_mastery(student_id, mastery_level) WHERE mastery_level < 0.6;

COMMENT ON TABLE concept_mastery IS 'Tracks student mastery level for each concept (0.0 = not learned, 1.0 = fully mastered)';
COMMENT ON COLUMN concept_mastery.mastery_level IS 'Mastery score from 0.0 (not learned) to 1.0 (fully mastered)';
COMMENT ON COLUMN concept_mastery.total_attempts IS 'Total quiz/exam questions attempted for this concept';

-- Study Sessions: Log all student study activities
CREATE TABLE IF NOT EXISTS student_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID REFERENCES course(id) ON DELETE SET NULL,
    session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'quiz', 'exam', 'assignment', 'study_guide', 'flashcards', 'reading')),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0),
    activity_data JSONB,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL CHECK (ended_at >= started_at),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_student_study_sessions_student ON student_study_sessions(student_id, started_at DESC);
CREATE INDEX idx_student_study_sessions_course ON student_study_sessions(course_id, started_at DESC);
CREATE INDEX idx_student_study_sessions_type ON student_study_sessions(session_type);
CREATE INDEX idx_student_study_sessions_date ON student_study_sessions(started_at::date);

COMMENT ON TABLE student_study_sessions IS 'Logs all student study activities for analytics and time tracking';
COMMENT ON COLUMN student_study_sessions.session_type IS 'Type of study activity: chat, quiz, exam, assignment, study_guide, flashcards, reading';
COMMENT ON COLUMN student_study_sessions.activity_data IS 'JSON metadata about the activity (e.g., quiz_id, questions_answered, score)';

-- Grade Predictions: AI-generated predictions for final grades
CREATE TABLE IF NOT EXISTS grade_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    predicted_final_grade DECIMAL(5,2) CHECK (predicted_final_grade >= 0 AND predicted_final_grade <= 100),
    confidence_level DECIMAL(3,2) CHECK (confidence_level >= 0 AND confidence_level <= 1),
    prediction_factors JSONB,
    algorithm_version TEXT DEFAULT '1.0',
    predicted_at TIMESTAMP DEFAULT NOW(),
    semester TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_grade_predictions_student ON grade_predictions(student_id, semester, predicted_at DESC);
CREATE INDEX idx_grade_predictions_course ON grade_predictions(course_id, semester);

COMMENT ON TABLE grade_predictions IS 'AI-generated predictions for student final grades';
COMMENT ON COLUMN grade_predictions.confidence_level IS 'AI confidence in prediction (0.0 = low, 1.0 = very confident)';
COMMENT ON COLUMN grade_predictions.prediction_factors IS 'JSON data explaining what factors influenced the prediction';
COMMENT ON COLUMN grade_predictions.algorithm_version IS 'Version of prediction algorithm used';

-- Function to update concept mastery after quiz/exam
CREATE OR REPLACE FUNCTION update_concept_mastery(
    p_student_id UUID,
    p_course_id UUID,
    p_concept_name TEXT,
    p_was_correct BOOLEAN
) RETURNS void AS $$
DECLARE
    v_correct_attempts INTEGER;
    v_total_attempts INTEGER;
    v_mastery_level DECIMAL(3,2);
BEGIN
    -- Insert or update concept mastery
    INSERT INTO concept_mastery (student_id, course_id, concept_name, correct_attempts, total_attempts, last_practiced_at)
    VALUES (
        p_student_id,
        p_course_id,
        p_concept_name,
        CASE WHEN p_was_correct THEN 1 ELSE 0 END,
        1,
        NOW()
    )
    ON CONFLICT (student_id, course_id, concept_name)
    DO UPDATE SET
        correct_attempts = concept_mastery.correct_attempts + CASE WHEN p_was_correct THEN 1 ELSE 0 END,
        total_attempts = concept_mastery.total_attempts + 1,
        last_practiced_at = NOW(),
        updated_at = NOW()
    RETURNING correct_attempts, total_attempts INTO v_correct_attempts, v_total_attempts;
    
    -- Calculate new mastery level (simple ratio with exponential decay for old mistakes)
    v_mastery_level := LEAST(1.0, v_correct_attempts::DECIMAL / NULLIF(v_total_attempts, 0));
    
    -- Update mastery level
    UPDATE concept_mastery
    SET mastery_level = v_mastery_level
    WHERE student_id = p_student_id 
      AND course_id = p_course_id 
      AND concept_name = p_concept_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_concept_mastery IS 'Updates concept mastery based on quiz/exam question results';

-- Function to record study session
CREATE OR REPLACE FUNCTION record_study_session(
    p_student_id UUID,
    p_course_id UUID,
    p_session_type TEXT,
    p_started_at TIMESTAMP,
    p_ended_at TIMESTAMP,
    p_activity_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_duration_minutes INTEGER;
BEGIN
    v_duration_minutes := EXTRACT(EPOCH FROM (p_ended_at - p_started_at)) / 60;
    
    INSERT INTO study_sessions (student_id, course_id, session_type, duration_minutes, activity_data, started_at, ended_at)
    VALUES (p_student_id, p_course_id, p_session_type, v_duration_minutes, p_activity_data, p_started_at, p_ended_at)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_study_session IS 'Records a study session and calculates duration automatically';

-- View for student performance summary
CREATE OR REPLACE VIEW student_performance_summary AS
SELECT 
    ph.student_id,
    ph.course_id,
    c.course_code,
    c.title AS course_name,
    ph.semester,
    AVG(ph.average_grade) AS average_grade,
    SUM(ph.assignments_completed) AS total_assignments_completed,
    SUM(ph.assignments_total) AS total_assignments,
    SUM(ph.study_time_minutes) AS total_study_time_minutes,
    COUNT(DISTINCT ph.week_number) AS weeks_tracked
FROM performance_history ph
JOIN course c ON c.id = ph.course_id
GROUP BY ph.student_id, ph.course_id, c.course_code, c.title, ph.semester;

COMMENT ON VIEW student_performance_summary IS 'Aggregated view of student performance across all weeks';
