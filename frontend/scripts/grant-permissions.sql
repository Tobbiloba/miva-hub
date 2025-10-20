-- Run this SQL to fix permissions on study_sessions table
-- You can run this in your database client (pgAdmin, TablePlus, etc.)
-- OR if you have psql: psql -U postgres -d better_chatbot -f scripts/grant-permissions.sql

GRANT ALL PRIVILEGES ON TABLE study_sessions TO better_chatbot;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO better_chatbot;

-- Verify permissions
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'study_sessions' 
AND grantee = 'better_chatbot';
