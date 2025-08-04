-- RBAC System Verification Script
-- Run this after migrations to verify RBAC system is working correctly

\echo '=========================================='
\echo '  RBAC System Verification'
\echo '=========================================='

-- 1. Verify roles exist
\echo ''
\echo '1. Checking predefined roles...'
SELECT 
    name, 
    display_name, 
    level, 
    is_system_role 
FROM public.roles 
ORDER BY level DESC;

-- 2. Verify permissions exist  
\echo ''
\echo '2. Checking permissions count by resource...'
SELECT 
    resource,
    COUNT(*) as permission_count,
    STRING_AGG(action, ', ') as actions
FROM public.permissions 
GROUP BY resource 
ORDER BY resource;

-- 3. Verify role-permission mappings
\echo ''
\echo '3. Checking role-permission mappings...'
SELECT 
    r.name as role_name,
    r.level,
    COUNT(rp.permission_id) as permission_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
GROUP BY r.name, r.level
ORDER BY r.level DESC;

-- 4. Test RBAC helper functions exist
\echo ''
\echo '4. Verifying RBAC helper functions...'
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'has_permission',
    'get_user_role', 
    'get_user_permissions',
    'has_role_level'
  )
ORDER BY routine_name;

-- 5. Check subscription plans
\echo ''
\echo '5. Checking subscription plans...'
SELECT 
    name,
    display_name,
    price_monthly / 100.0 as price_monthly_inr,
    max_members,
    max_staff,
    is_active,
    is_popular
FROM public.subscription_plans 
ORDER BY sort_order;

-- 6. Verify RLS is enabled on key tables
\echo ''
\echo '6. Checking Row Level Security status...'
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    relforcerowsecurity as rls_forced
FROM pg_tables pt
JOIN pg_class pc ON pc.relname = pt.tablename
WHERE schemaname = 'public'
  AND tablename IN (
    'gyms', 'profiles', 'members', 'member_activities',
    'subscriptions', 'payment_methods', 'user_roles',
    'roles', 'permissions'
  )
ORDER BY tablename;

-- 7. Check policies exist on key tables
\echo ''
\echo '7. Checking RLS policies...'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as command_type
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 8. Verify views exist
\echo ''
\echo '8. Checking secure views...'
SELECT 
    table_name,
    table_type,
    is_insertable_into
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
  AND table_name LIKE '%_view'
ORDER BY table_name;

-- 9. Test permission function with sample data
\echo ''
\echo '9. Testing RBAC functions (with sample UUIDs)...'
\echo 'Note: These will return false/null for non-existent users - this is expected'

-- Test has_permission function
SELECT 'has_permission test:' as test_type,
       has_permission(
         '00000000-0000-0000-0000-000000000001'::uuid,
         '00000000-0000-0000-0000-000000000001'::uuid,
         'members.read'
       ) as result;

-- Test get_user_role function  
SELECT 'get_user_role test:' as test_type,
       get_user_role(
         '00000000-0000-0000-0000-000000000001'::uuid,
         '00000000-0000-0000-0000-000000000001'::uuid
       ) as result;

-- 10. Verify indexes exist
\echo ''
\echo '10. Checking key indexes...'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND tablename IN ('user_roles', 'role_permissions', 'members', 'subscriptions')
ORDER BY tablename, indexname;

-- 11. Check triggers exist
\echo ''
\echo '11. Checking triggers...'
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE 'RI_%' -- Exclude foreign key triggers
ORDER BY event_object_table, trigger_name;

-- 12. Final summary
\echo ''
\echo '=========================================='
\echo '  RBAC Verification Summary'
\echo '=========================================='

DO $$
DECLARE
    role_count INTEGER;
    permission_count INTEGER;
    role_permission_count INTEGER;
    plan_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT COUNT(*) INTO permission_count FROM public.permissions;
    SELECT COUNT(*) INTO role_permission_count FROM public.role_permissions;
    SELECT COUNT(*) INTO plan_count FROM public.subscription_plans WHERE is_active = true;
    
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('has_permission', 'get_user_role', 'get_user_permissions', 'has_role_level');
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'VIEW' AND table_name LIKE '%_view';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE 'RBAC System Status:';
    RAISE NOTICE '- Roles: % (expected: 5)', role_count;
    RAISE NOTICE '- Permissions: % (expected: 17+)', permission_count; 
    RAISE NOTICE '- Role-Permission mappings: % (expected: 20+)', role_permission_count;
    RAISE NOTICE '- Active subscription plans: % (expected: 3)', plan_count;
    RAISE NOTICE '- RBAC helper functions: % (expected: 4)', function_count;
    RAISE NOTICE '- Secure views: % (expected: 5)', view_count;
    RAISE NOTICE '- RLS policies: % (expected: 25+)', policy_count;
    RAISE NOTICE '';
    
    IF role_count >= 5 AND permission_count >= 17 AND role_permission_count >= 20 AND 
       plan_count >= 3 AND function_count = 4 AND view_count >= 5 AND policy_count >= 25 THEN
        RAISE NOTICE '✅ RBAC system verification PASSED';
        RAISE NOTICE '   All components are properly configured';
    ELSE
        RAISE NOTICE '❌ RBAC system verification FAILED';
        RAISE NOTICE '   Some components may be missing or misconfigured';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test user registration and gym creation';
    RAISE NOTICE '2. Verify permission checking in your application';
    RAISE NOTICE '3. Test multi-tenant data isolation';
    RAISE NOTICE '4. Set up payment gateway integration';
END $$;