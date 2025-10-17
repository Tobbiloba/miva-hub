-- MIVA University Complete Database Reset Script
-- ⚠️  WARNING: This will DELETE ALL DATA from the entire database! ⚠️
-- Clears all users, courses, content, configurations - EVERYTHING
-- Only the table structure will remain intact
-- Use this for complete fresh start testing

BEGIN;

-- Display warning and current data counts
SELECT 'WARNING: About to clear ALL DATA from ALL TABLES!' as warning_message;
SELECT 'Current user count: ' || COUNT(*) as info FROM "user";
SELECT 'Current course count: ' || COUNT(*) as info FROM course;
SELECT 'Current enrollment count: ' || COUNT(*) as info FROM student_enrollment;

-- Disable foreign key constraints temporarily for faster deletion
SET session_replication_role = replica;

-- ===============================
-- CLEAR ALL TABLES (in dependency order)
-- Based on actual existing tables in database
-- ===============================

-- AI Processing & Content Analysis (deepest dependencies)
TRUNCATE TABLE content_embedding CASCADE;
TRUNCATE TABLE ai_processed_content CASCADE;
TRUNCATE TABLE ai_processing_job CASCADE;

-- Course Content & Materials
TRUNCATE TABLE course_material CASCADE;

-- Assignment & Submission Data
TRUNCATE TABLE assignment_submission CASCADE;
TRUNCATE TABLE assignment CASCADE;

-- Attendance & Academic Records
TRUNCATE TABLE attendance CASCADE;

-- Academic Schedule & Calendar
TRUNCATE TABLE class_schedule CASCADE;
TRUNCATE TABLE academic_calendar CASCADE;

-- Announcements & Communications
TRUNCATE TABLE announcement CASCADE;

-- Course Structure & Relationships
TRUNCATE TABLE student_enrollment CASCADE;
TRUNCATE TABLE course_instructor CASCADE;
TRUNCATE TABLE course_week CASCADE;
TRUNCATE TABLE course_prerequisite CASCADE;
TRUNCATE TABLE course CASCADE;

-- Faculty & Academic Staff
TRUNCATE TABLE faculty CASCADE;

-- Departments & Academic Organization
TRUNCATE TABLE department CASCADE;

-- User Management & Authentication
TRUNCATE TABLE session CASCADE;
TRUNCATE TABLE account CASCADE;
TRUNCATE TABLE verification CASCADE;
TRUNCATE TABLE "user" CASCADE;

-- Chat & Messaging System
TRUNCATE TABLE chat_message CASCADE;
TRUNCATE TABLE chat_thread CASCADE;

-- Workflow & Automation
TRUNCATE TABLE workflow_edge CASCADE;
TRUNCATE TABLE workflow_node CASCADE;
TRUNCATE TABLE workflow CASCADE;

-- Archive & Storage
TRUNCATE TABLE archive_item CASCADE;
TRUNCATE TABLE archive CASCADE;

-- Bookmarks & User Preferences
TRUNCATE TABLE bookmark CASCADE;

-- MCP Server Configuration & Customization
TRUNCATE TABLE mcp_server_tool_custom_instructions CASCADE;
TRUNCATE TABLE mcp_server_custom_instructions CASCADE;
TRUNCATE TABLE mcp_oauth_session CASCADE;
TRUNCATE TABLE mcp_server CASCADE;

-- Agents & AI Assistants
TRUNCATE TABLE agent CASCADE;

-- Test/Development tables
TRUNCATE TABLE test_embedding CASCADE;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- ===============================
-- RESET ALL SEQUENCES
-- ===============================

-- Reset UUID sequences (PostgreSQL will auto-generate new UUIDs)
-- Most tables use UUID primary keys with defaultRandom(), so no sequence reset needed

-- Reset any integer sequences if they exist
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name, sequence_schema 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'SELECT setval(''' || seq_record.sequence_schema || '.' || seq_record.sequence_name || ''', 1, false)';
    END LOOP;
END $$;

-- ===============================
-- VERIFICATION - Confirm all tables are empty
-- ===============================

SELECT 'VERIFICATION: Checking all tables are empty...' as status;

-- Check all cleared tables (only existing tables)
SELECT 'Users: ' || COUNT(*) as table_status FROM "user"
UNION ALL
SELECT 'Departments: ' || COUNT(*) FROM department
UNION ALL
SELECT 'Courses: ' || COUNT(*) FROM course
UNION ALL
SELECT 'Enrollments: ' || COUNT(*) FROM student_enrollment
UNION ALL
SELECT 'Faculty: ' || COUNT(*) FROM faculty
UNION ALL
SELECT 'Course Materials: ' || COUNT(*) FROM course_material
UNION ALL
SELECT 'Assignments: ' || COUNT(*) FROM assignment
UNION ALL
SELECT 'Announcements: ' || COUNT(*) FROM announcement
UNION ALL
SELECT 'Class Schedules: ' || COUNT(*) FROM class_schedule
UNION ALL
SELECT 'AI Processed Content: ' || COUNT(*) FROM ai_processed_content
UNION ALL
SELECT 'Content Embeddings: ' || COUNT(*) FROM content_embedding
UNION ALL
SELECT 'Chat Threads: ' || COUNT(*) FROM chat_thread
UNION ALL
SELECT 'Chat Messages: ' || COUNT(*) FROM chat_message
UNION ALL
SELECT 'MCP Servers: ' || COUNT(*) FROM mcp_server
UNION ALL
SELECT 'Workflows: ' || COUNT(*) FROM workflow
UNION ALL
SELECT 'Archives: ' || COUNT(*) FROM archive
UNION ALL
SELECT 'Bookmarks: ' || COUNT(*) FROM bookmark
UNION ALL
SELECT 'Agents: ' || COUNT(*) FROM agent;

-- ===============================
-- SUCCESS MESSAGE
-- ===============================

SELECT '🗑️  DATABASE COMPLETELY CLEARED! 🗑️' as result;
SELECT 'All data has been removed from all tables.' as info;
SELECT 'Table structures remain intact and ready for fresh data.' as info;
SELECT 'MCP tools will now return empty results until new data is added.' as info;

COMMIT;

-- Final confirmation
SELECT 'SUCCESS: Complete database reset completed successfully!' as final_status;