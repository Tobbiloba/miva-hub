-- ====================================
-- Migration: Exam Tables for Study Buddy API
-- ====================================

-- Create generated_exams table
CREATE TABLE IF NOT EXISTS generated_exams (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    questions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES course(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_generated_exams_course ON generated_exams(course_id);
CREATE INDEX IF NOT EXISTS idx_generated_exams_created ON generated_exams(created_at DESC);

COMMENT ON TABLE generated_exams IS 'AI-generated exams for courses';
COMMENT ON COLUMN generated_exams.questions IS 'Array of exam questions with answers in JSON format';


-- Create exam_submissions table
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL,
    student_id VARCHAR(50) NOT NULL,
    answers JSONB NOT NULL,
    score_percentage DECIMAL(5,2),
    grade VARCHAR(2),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES generated_exams(id) ON DELETE CASCADE,
    CONSTRAINT valid_score CHECK (score_percentage >= 0 AND score_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_exam_submissions_student ON exam_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_submissions_score ON exam_submissions(score_percentage DESC);

COMMENT ON TABLE exam_submissions IS 'Student exam submissions and grades';
COMMENT ON COLUMN exam_submissions.answers IS 'Student submitted answers in JSON format';
COMMENT ON COLUMN exam_submissions.score_percentage IS 'Final score as percentage (0-100)';
COMMENT ON COLUMN exam_submissions.grade IS 'Letter grade (A, B, C, D, F)';
