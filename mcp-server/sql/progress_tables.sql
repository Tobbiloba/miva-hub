-- ================================================
-- Progress Tracking Tables for Auto-Save
-- Auto-save quiz, exam, and assignment progress
-- ================================================

-- Quiz Progress (drafts before submission)
CREATE TABLE IF NOT EXISTS quiz_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    current_question INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'interactive',
    started_at TIMESTAMP DEFAULT NOW(),
    last_saved_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_progress_student ON quiz_progress(student_id, last_saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_progress_quiz ON quiz_progress(quiz_id);

COMMENT ON TABLE quiz_progress IS 'Auto-save quiz progress (drafts before submission)';
COMMENT ON COLUMN quiz_progress.answers IS 'Question number to answer mapping {"0": "answer1", "1": "answer2"}';
COMMENT ON COLUMN quiz_progress.mode IS 'Current UI mode: preview, interactive, or results';

-- Exam Progress (drafts with timer state)
CREATE TABLE IF NOT EXISTS exam_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    time_remaining_seconds INTEGER,
    current_question INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'interactive',
    started_at TIMESTAMP DEFAULT NOW(),
    last_saved_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_progress_student ON exam_progress(student_id, last_saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_progress_exam ON exam_progress(exam_id);

COMMENT ON TABLE exam_progress IS 'Auto-save exam progress with timer state';
COMMENT ON COLUMN exam_progress.time_remaining_seconds IS 'Seconds remaining when last saved';

-- Assignment Progress (submission drafts)
CREATE TABLE IF NOT EXISTS assignment_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    submission_text TEXT,
    submission_files JSONB DEFAULT '[]',
    submission_link TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    last_saved_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_assignment_progress_student ON assignment_progress(student_id, last_saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_progress_assignment ON assignment_progress(assignment_id);

COMMENT ON TABLE assignment_progress IS 'Auto-save assignment submissions (drafts)';
COMMENT ON COLUMN assignment_progress.submission_files IS 'Array of uploaded file metadata';

-- Auto-cleanup function: Delete progress older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_progress() RETURNS void AS $$
BEGIN
    DELETE FROM quiz_progress WHERE last_saved_at < NOW() - INTERVAL '7 days';
    DELETE FROM exam_progress WHERE last_saved_at < NOW() - INTERVAL '7 days';
    DELETE FROM assignment_progress WHERE last_saved_at < NOW() - INTERVAL '7 days';
    
    RAISE NOTICE 'Cleaned up progress entries older than 7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_progress IS 'Delete progress entries older than 7 days - run via cron job';

-- Optional: Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-progress', '0 2 * * *', 'SELECT cleanup_old_progress()');
