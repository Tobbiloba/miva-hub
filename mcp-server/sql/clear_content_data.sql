-- MIVA University Database Content Clearing Script
-- Clears all uploaded content and AI processing data while preserving core academic structure
-- Run this script to completely reset the content pipeline for testing

-- Disable foreign key checks temporarily for faster deletion
SET session_replication_role = replica;

-- Clear all AI processing and content data (in dependency order)
TRUNCATE TABLE content_embeddings CASCADE;
TRUNCATE TABLE ai_processed_content CASCADE;
TRUNCATE TABLE ai_processing_jobs CASCADE;
TRUNCATE TABLE ai_content_analytics CASCADE;

-- Clear course materials (uploaded files)
TRUNCATE TABLE course_materials CASCADE;

-- Clear study buddy related data
TRUNCATE TABLE source_citations CASCADE;
TRUNCATE TABLE learning_analytics CASCADE;
TRUNCATE TABLE generated_study_materials CASCADE;
TRUNCATE TABLE chat_messages CASCADE;
TRUNCATE TABLE study_sessions CASCADE;

-- Clear course weeks if they exist (from recent schema)
TRUNCATE TABLE course_week CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Display summary of cleared data
SELECT 
    'content_embeddings' as table_name, 
    (SELECT COUNT(*) FROM content_embeddings) as remaining_rows
UNION ALL
SELECT 
    'ai_processed_content' as table_name, 
    (SELECT COUNT(*) FROM ai_processed_content) as remaining_rows
UNION ALL
SELECT 
    'ai_processing_jobs' as table_name, 
    (SELECT COUNT(*) FROM ai_processing_jobs) as remaining_rows
UNION ALL
SELECT 
    'course_materials' as table_name, 
    (SELECT COUNT(*) FROM course_materials) as remaining_rows
UNION ALL
SELECT 
    'study_sessions' as table_name, 
    (SELECT COUNT(*) FROM study_sessions) as remaining_rows;

-- Reset any auto-increment sequences
SELECT setval(pg_get_serial_sequence('course_materials', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('ai_processing_jobs', 'id'), 1, false);

COMMIT;

-- Success message
SELECT 'Database content successfully cleared! Core academic data (courses, departments, students, faculty) preserved.' as status;