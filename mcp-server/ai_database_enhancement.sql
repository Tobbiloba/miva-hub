-- MIVA University AI Database Enhancement
-- Adds AI capabilities to existing database without breaking anything
-- Links to existing course_materials table (id SERIAL PRIMARY KEY)

-- =======================================================
-- STEP 1: Add pgvector extension (non-breaking change)
-- =======================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension is available
-- SELECT * FROM pg_extension WHERE extname = 'vector';

-- =======================================================
-- STEP 2: AI Enhancement Tables (link to existing schema)
-- =======================================================

-- Table to store AI-processed content from existing course materials
CREATE TABLE IF NOT EXISTS ai_processed_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    
    -- Processing metadata
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    
    -- AI-extracted content
    extracted_text TEXT, -- Full text extracted from PDF/video/etc
    ai_summary TEXT, -- AI-generated summary
    key_concepts TEXT[], -- Array of key concepts identified by AI
    learning_objectives TEXT[], -- Learning objectives extracted
    difficulty_level VARCHAR(20) DEFAULT 'intermediate' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    
    -- Metadata
    ai_model_used VARCHAR(100) DEFAULT 'llama3.2:3b', -- Track which AI model was used
    embedding_model_used VARCHAR(100) DEFAULT 'nomic-embed-text', -- Track embedding model
    word_count INTEGER, -- Number of words in extracted text
    estimated_reading_time INTEGER, -- Minutes to read
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vector embeddings table for semantic search
CREATE TABLE IF NOT EXISTS content_embeddings (
    id SERIAL PRIMARY KEY,
    course_material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    ai_processed_id UUID REFERENCES ai_processed_content(id) ON DELETE CASCADE,
    
    -- Chunk information
    chunk_text TEXT NOT NULL, -- The actual text chunk
    chunk_index INTEGER NOT NULL, -- Order of chunk in document
    chunk_type VARCHAR(50) DEFAULT 'content', -- 'content', 'summary', 'objective'
    
    -- Vector embedding (nomic-embed-text produces 768-dimensional vectors)
    embedding VECTOR(768) NOT NULL,
    
    -- Metadata for better search
    metadata JSONB DEFAULT '{}', -- Store additional info like page numbers, timestamps, etc.
    
    -- Performance fields
    similarity_cache JSONB DEFAULT '{}', -- Cache common similarity scores
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Background processing jobs queue
CREATE TABLE IF NOT EXISTS ai_processing_jobs (
    id SERIAL PRIMARY KEY,
    course_material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    
    -- Job details
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('pdf_processing', 'video_transcription', 'interactive_parsing', 'embedding_generation')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
    
    -- Progress tracking
    progress INTEGER DEFAULT 0, -- 0-100 percentage
    current_step VARCHAR(100), -- Current processing step description
    total_steps INTEGER DEFAULT 1, -- Total number of steps
    
    -- Error handling
    error_message TEXT, -- Store error details if job fails
    retry_count INTEGER DEFAULT 0, -- Number of retries attempted
    max_retries INTEGER DEFAULT 3, -- Maximum retries allowed
    
    -- Performance tracking
    estimated_duration INTEGER, -- Estimated time in seconds
    actual_duration INTEGER, -- Actual processing time
    
    -- Job metadata
    job_config JSONB DEFAULT '{}', -- Store job-specific configuration
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP
);

-- AI analytics and insights table
CREATE TABLE IF NOT EXISTS ai_content_analytics (
    id SERIAL PRIMARY KEY,
    course_material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
    
    -- Student engagement analytics (when implemented)
    view_count INTEGER DEFAULT 0,
    question_count INTEGER DEFAULT 0, -- How many questions asked about this content
    avg_similarity_score FLOAT, -- Average relevance when searched
    
    -- Content quality metrics
    readability_score FLOAT, -- AI-assessed readability
    concept_density FLOAT, -- How concept-heavy the material is
    prerequisite_complexity FLOAT, -- How much prior knowledge needed
    
    -- AI confidence scores
    extraction_confidence FLOAT, -- How confident AI is in text extraction
    summary_confidence FLOAT, -- How confident AI is in summary
    concept_confidence FLOAT, -- How confident AI is in concept extraction
    
    -- Update tracking
    last_analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    analysis_version VARCHAR(20) DEFAULT '1.0'
);

-- =======================================================
-- STEP 3: Performance Indexes (optimized for M1 Pro)
-- =======================================================

-- Vector similarity search index (critical for performance)
CREATE INDEX IF NOT EXISTS idx_content_embeddings_vector 
ON content_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Foreign key indexes for fast joins
CREATE INDEX IF NOT EXISTS idx_ai_processed_content_material_id 
ON ai_processed_content(course_material_id);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_material_id 
ON content_embeddings(course_material_id);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_processed_id 
ON content_embeddings(ai_processed_id);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_material_id 
ON ai_processing_jobs(course_material_id);

-- Status and priority indexes for job queue
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status_priority 
ON ai_processing_jobs(status, priority) 
WHERE status IN ('pending', 'processing');

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_processed_status_material 
ON ai_processed_content(processing_status, course_material_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_material_chunk 
ON content_embeddings(course_material_id, chunk_index);

-- =======================================================
-- STEP 4: Useful Views for Easy Access
-- =======================================================

-- View combining course materials with AI processing status
CREATE OR REPLACE VIEW course_materials_with_ai AS
SELECT 
    cm.*,
    apc.processing_status,
    apc.ai_summary,
    apc.key_concepts,
    apc.difficulty_level,
    apc.word_count,
    apc.estimated_reading_time,
    CASE 
        WHEN apc.id IS NOT NULL THEN true 
        ELSE false 
    END as ai_processed,
    COUNT(ce.id) as embedding_chunks_count
FROM course_materials cm
LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
LEFT JOIN content_embeddings ce ON cm.id = ce.course_material_id
GROUP BY cm.id, apc.id, apc.processing_status, apc.ai_summary, apc.key_concepts, 
         apc.difficulty_level, apc.word_count, apc.estimated_reading_time;

-- View for pending processing jobs
CREATE OR REPLACE VIEW pending_ai_jobs AS
SELECT 
    aj.*,
    cm.title as material_title,
    cm.material_type,
    c.course_code,
    c.course_name
FROM ai_processing_jobs aj
JOIN course_materials cm ON aj.course_material_id = cm.id
JOIN courses c ON cm.course_id = c.id
WHERE aj.status = 'pending'
ORDER BY aj.priority ASC, aj.created_at ASC;

-- =======================================================
-- STEP 5: Sample Functions for AI Operations
-- =======================================================

-- Function to search content semantically
CREATE OR REPLACE FUNCTION semantic_search(
    query_embedding VECTOR(768),
    course_filter TEXT DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.5,
    result_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    course_material_id INTEGER,
    material_title TEXT,
    material_type TEXT,
    chunk_text TEXT,
    similarity_score FLOAT,
    course_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.course_material_id,
        cm.title,
        cm.material_type,
        ce.chunk_text,
        1 - (ce.embedding <=> query_embedding) as similarity_score,
        c.course_code
    FROM content_embeddings ce
    JOIN course_materials cm ON ce.course_material_id = cm.id
    JOIN courses c ON cm.course_id = c.id
    WHERE 
        (course_filter IS NULL OR c.course_code = course_filter)
        AND (1 - (ce.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY ce.embedding <=> query_embedding
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get AI summary for a course material
CREATE OR REPLACE FUNCTION get_ai_summary(material_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'material_id', cm.id,
        'title', cm.title,
        'material_type', cm.material_type,
        'ai_summary', apc.ai_summary,
        'key_concepts', apc.key_concepts,
        'learning_objectives', apc.learning_objectives,
        'difficulty_level', apc.difficulty_level,
        'word_count', apc.word_count,
        'estimated_reading_time', apc.estimated_reading_time,
        'processing_status', apc.processing_status
    ) INTO result
    FROM course_materials cm
    LEFT JOIN ai_processed_content apc ON cm.id = apc.course_material_id
    WHERE cm.id = material_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =======================================================
-- STEP 6: Verification Queries
-- =======================================================

-- Check if pgvector extension is installed
SELECT 
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname = 'vector';

-- Count existing course materials (should show your existing data)
SELECT 
    'Existing Course Materials' as table_name,
    COUNT(*) as count 
FROM course_materials;

-- Show new AI tables (should be 0 initially)
SELECT 'AI Processed Content' as table_name, COUNT(*) as count FROM ai_processed_content
UNION ALL
SELECT 'Content Embeddings' as table_name, COUNT(*) as count FROM content_embeddings
UNION ALL
SELECT 'AI Processing Jobs' as table_name, COUNT(*) as count FROM ai_processing_jobs
UNION ALL
SELECT 'AI Analytics' as table_name, COUNT(*) as count FROM ai_content_analytics;

-- =======================================================
-- STEP 7: Example Usage (for testing)
-- =======================================================

-- Example: Queue a job to process all COS202 materials
-- INSERT INTO ai_processing_jobs (course_material_id, job_type)
-- SELECT id, 'pdf_processing' 
-- FROM course_materials cm
-- JOIN courses c ON cm.course_id = c.id
-- WHERE c.course_code = 'COS202' AND cm.material_type = 'pdf';

-- Example: View materials that need AI processing
-- SELECT * FROM course_materials_with_ai WHERE NOT ai_processed;

-- =======================================================
-- SUCCESS MESSAGE
-- =======================================================

SELECT 'MIVA AI Database Enhancement Completed Successfully! 🎉' as status,
       'Your existing course_materials data is preserved and enhanced with AI capabilities.' as message;