-- ANALYZE EXISTING SCHEMA
-- This script checks the current database structure to identify compatibility issues

\echo '=========================================='
\echo '  Existing Database Schema Analysis'
\echo '=========================================='

-- 1. Check existing tables
\echo ''
\echo '1. Existing tables in public schema:'
SELECT 
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Check columns in key tables
\echo ''
\echo '2. Columns in gyms table:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'gyms'
ORDER BY ordinal_position;

\echo ''
\echo '3. Columns in profiles table:'
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check for RBAC tables
\echo ''
\echo '4. RBAC-related tables (if they exist):'
SELECT 
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('roles', 'permissions', 'role_permissions', 'user_roles')
ORDER BY tablename;

-- 4. Check constraints
\echo ''
\echo '5. Existing constraints:'
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    conrelid::regclass as table_name
FROM pg_constraint 
WHERE connamespace = 'public'::regnamespace
  AND conrelid::regclass::text IN ('gyms', 'profiles', 'members', 'subscriptions')
ORDER BY table_name, constraint_name;

-- 5. Check indexes
\echo ''
\echo '6. Existing indexes:'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('gyms', 'profiles', 'members', 'subscriptions')
ORDER BY tablename, indexname;

-- 6. Check RLS status
\echo ''
\echo '7. Row Level Security status:'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public'
ORDER BY tablename;

-- 7. Check functions
\echo ''
\echo '8. Existing functions:'
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- 8. Check triggers
\echo ''
\echo '9. Existing triggers:'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE 'RI_%'
ORDER BY event_object_table, trigger_name;

\echo ''
\echo '=========================================='
\echo '  Analysis Complete'
\echo '=========================================='