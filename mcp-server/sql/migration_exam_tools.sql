-- ====================================
-- Migration: Exam Simulator Support
-- ====================================
-- Add support for exam generation and submission tracking

-- Add source_type column to track origin of generated materials
ALTER TABLE generated_study_materials 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'course_materials';

COMMENT ON COLUMN generated_study_materials.source_type IS 'Origin of material: course_materials, student_notes, auto_generated';

-- Create exam attempts table to track student exam submissions
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id VARCHAR(50) NOT NULL,
    exam_id INTEGER REFERENCES generated_study_materials(id) ON DELETE CASCADE,
    answers JSONB NOT NULL,
    score DECIMAL(5,2),
    correct_answers INTEGER,
    total_questions INTEGER,
    grade VARCHAR(2),
    time_taken_minutes INTEGER,
    submitted_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_score CHECK (score >= 0 AND score <= 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student ON exam_attempts(student_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_score ON exam_attempts(score DESC);

-- Comments
COMMENT ON TABLE exam_attempts IS 'Track student exam submissions and scores';
COMMENT ON COLUMN exam_attempts.answers IS 'Student submitted answers in JSON format';
COMMENT ON COLUMN exam_attempts.score IS 'Final score as percentage (0-100)';
COMMENT ON COLUMN exam_attempts.grade IS 'Letter grade (A, B, C, D, F)';
