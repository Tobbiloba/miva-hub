-- ====================================
-- Phase 4A: Study Buddy Database Schema
-- ====================================
-- Add study session and chat functionality to existing MIVA database

-- Study Sessions Table
-- Track individual study sessions for analytics and context
CREATE TABLE IF NOT EXISTS study_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER, -- Will reference students when authentication is fully integrated
    course_id INTEGER REFERENCES courses(id),
    session_start TIMESTAMP DEFAULT NOW(),
    session_end TIMESTAMP,
    total_questions INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    session_context JSONB DEFAULT '{}', -- Store session-specific context
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Chat Messages Table
-- Store conversation history for context and analytics
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES study_sessions(id) ON DELETE CASCADE,
    message_type TEXT CHECK (message_type IN ('question', 'answer', 'system')) NOT NULL,
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]', -- Array of source material references
    metadata JSONB DEFAULT '{}', -- Additional message metadata
    response_time_ms INTEGER, -- Track AI response performance
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated Study Materials Table
-- Store AI-generated study content for reuse and caching
CREATE TABLE IF NOT EXISTS generated_study_materials (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id),
    material_type TEXT CHECK (material_type IN ('summary', 'flashcards', 'quiz', 'study_guide', 'concept_map')) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content JSONB NOT NULL, -- Structured content based on type
    source_materials JSONB DEFAULT '[]', -- Referenced course materials
    generation_prompt TEXT, -- Store the prompt used for regeneration
    quality_score FLOAT CHECK (quality_score >= 0 AND quality_score <= 1),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Learning Analytics Table
-- Track student learning patterns and progress
CREATE TABLE IF NOT EXISTS learning_analytics (
    id SERIAL PRIMARY KEY,
    student_id INTEGER, -- Will reference students when authentication is integrated
    course_id INTEGER REFERENCES courses(id),
    topic VARCHAR(100), -- Extracted topic from conversations
    questions_asked INTEGER DEFAULT 0,
    concepts_covered JSONB DEFAULT '[]', -- Array of concepts discussed
    difficulty_preference VARCHAR(20) DEFAULT 'medium',
    avg_session_duration INTERVAL,
    last_activity TIMESTAMP DEFAULT NOW(),
    mastery_level FLOAT CHECK (mastery_level >= 0 AND mastery_level <= 1) DEFAULT 0.5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Source Citations Table
-- Track which course materials are referenced in responses
CREATE TABLE IF NOT EXISTS source_citations (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE,
    course_material_id INTEGER REFERENCES course_materials(id),
    ai_processed_id UUID REFERENCES ai_processed_content(id), -- UUID to match existing schema
    content_chunk TEXT, -- Specific text chunk referenced
    relevance_score FLOAT CHECK (relevance_score >= 0 AND relevance_score <= 1),
    citation_context TEXT, -- How this source was used in the response
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_study_sessions_student_course ON study_sessions(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_active ON study_sessions(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_type ON chat_messages(message_type, created_at);
CREATE INDEX IF NOT EXISTS idx_generated_materials_course_type ON generated_study_materials(course_id, material_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_student_course ON learning_analytics(student_id, course_id);
CREATE INDEX IF NOT EXISTS idx_source_citations_message ON source_citations(message_id);
CREATE INDEX IF NOT EXISTS idx_source_citations_material ON source_citations(course_material_id);

-- Update Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_study_materials_updated_at BEFORE UPDATE ON generated_study_materials 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_analytics_updated_at BEFORE UPDATE ON learning_analytics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample Data for Testing
INSERT INTO study_sessions (course_id, total_questions, session_context) VALUES 
(1, 0, '{"preferred_difficulty": "medium", "topics_of_interest": ["programming", "algorithms"]}'),
(1, 0, '{"preferred_difficulty": "beginner", "topics_of_interest": ["variables", "loops"]}');

COMMENT ON TABLE study_sessions IS 'Individual study sessions for tracking student interactions';
COMMENT ON TABLE chat_messages IS 'Conversation history between students and AI study buddy';
COMMENT ON TABLE generated_study_materials IS 'AI-generated study content cached for reuse';
COMMENT ON TABLE learning_analytics IS 'Student learning patterns and progress tracking';
COMMENT ON TABLE source_citations IS 'References to course materials used in AI responses';