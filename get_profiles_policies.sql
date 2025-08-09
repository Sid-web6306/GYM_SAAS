-- Get all policies for profiles table
-- Run this in your Supabase SQL editor

-- 1. Get all policies for profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'profiles'
AND schemaname = 'public'
ORDER BY policyname;

-- 2. Check if RLS is enabled on profiles table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 3. Get detailed policy information
SELECT 
    p.policyname,
    p.cmd,
    p.qual as using_clause,
    p.with_check as with_check_clause,
    p.roles,
    p.permissive
FROM pg_policies p
WHERE p.tablename = 'profiles'
AND p.schemaname = 'public'
ORDER BY p.policyname;

-- 4. Check for potential recursion issues
-- Look for policies that reference the profiles table in their conditions
SELECT 
    policyname,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'profiles'
AND schemaname = 'public'
AND (
    qual LIKE '%profiles%' 
    OR with_check LIKE '%profiles%'
); 