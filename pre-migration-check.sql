-- QUICK DATABASE STATE CHECK
-- Run this FIRST to see what's currently in your database

-- Check existing tables
SELECT 
    schemaname, 
    tablename,
    'existing table' as status
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check existing sequences
SELECT 
    sequence_name,
    'existing sequence' as status
FROM information_schema.sequences 
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- Check existing functions
SELECT 
    proname as function_name,
    'existing function' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('generate_custom_id', 'create_complete_user', 'auto_generate_id')
ORDER BY proname;