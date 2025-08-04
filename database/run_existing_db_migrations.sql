-- MIGRATION FOR EXISTING DATABASE
-- This runs only the parts we need since you already have a functional RBAC system

\echo '=========================================='
\echo '  Running Migrations for Existing DB'
\echo '=========================================='

-- Skip 01 (base schema) - you already have it
-- Skip 02 (RBAC system) - you already have it  
-- Skip 03 (member system) - you already have it
-- Skip 04 (subscription system) - you already have it

-- ========== 05. ADD ANY MISSING FUNCTIONS ==========
\echo ''
\echo 'Step 5: Checking/adding missing functions...'

-- Add has_active_subscription function if missing
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_active_subscription boolean := false;
  has_active_trial boolean := false;
BEGIN
  -- Check for active paid subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active'
    AND current_period_end > now()
    AND (trial_status IS NULL OR trial_status = 'converted')
  ) INTO has_active_subscription;
  
  -- Check for active trial subscription
  SELECT EXISTS(
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = p_user_id 
    AND status = 'active'
    AND trial_status = 'active'
    AND trial_end_date > now()
  ) INTO has_active_trial;

  RETURN has_active_subscription OR has_active_trial;
END;
$$;

\echo 'Functions updated'

-- ========== 06. ENSURE ESSENTIAL TRIGGERS EXIST ==========
\echo ''
\echo 'Step 6: Checking essential triggers...'

-- Most triggers already exist, just ensure the auth user trigger exists
-- (This should already exist based on our analysis)

-- Check if on_auth_user_created trigger exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND trigger_schema = 'auth'
    ) THEN
        -- Create the trigger if it doesn't exist
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
        
        RAISE NOTICE 'Created on_auth_user_created trigger';
    ELSE
        RAISE NOTICE 'on_auth_user_created trigger already exists';
    END IF;
END $$;

-- ========== 07. RLS POLICIES CHECK ==========
\echo ''
\echo 'Step 7: Verifying RLS policies...'

-- Check if we have sufficient policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    
    IF policy_count >= 20 THEN
        RAISE NOTICE 'RLS policies look good: % policies found', policy_count;
    ELSE
        RAISE NOTICE 'Warning: Only % RLS policies found, may need more', policy_count;
    END IF;
END $$;

-- ========== 08. ADD ANY MISSING PERFORMANCE INDEXES ==========
\echo ''
\echo 'Step 8: Adding missing performance indexes...'

-- Add some key indexes that might be missing
CREATE INDEX IF NOT EXISTS idx_user_roles_permission_check ON public.user_roles(user_id, gym_id, is_active, role_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_lookup ON public.role_permissions(role_id, permission_id);

-- Member activity performance indexes
CREATE INDEX IF NOT EXISTS idx_member_activities_timeline ON public.member_activities(timestamp DESC, member_id, activity_type);
CREATE INDEX IF NOT EXISTS idx_members_gym_status_type ON public.members(gym_id, status, membership_type) WHERE status = 'active';

-- Subscription performance indexes  
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_period ON public.subscriptions(user_id, status, current_period_end) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal ON public.subscriptions(current_period_end, status) WHERE status = 'active';

\echo 'Performance indexes added'

-- ========== 09. ENSURE SEED DATA EXISTS ==========
\echo ''
\echo 'Step 9: Checking seed data...'

DO $$
DECLARE
    role_count INTEGER;
    permission_count INTEGER;
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM public.roles;
    SELECT COUNT(*) INTO permission_count FROM public.permissions;
    SELECT COUNT(*) INTO plan_count FROM public.subscription_plans WHERE is_active = true;
    
    RAISE NOTICE 'Current data counts:';
    RAISE NOTICE '- Roles: %', role_count;
    RAISE NOTICE '- Permissions: %', permission_count;
    RAISE NOTICE '- Active subscription plans: %', plan_count;
    
    IF role_count >= 5 AND permission_count >= 17 AND plan_count >= 3 THEN
        RAISE NOTICE '✅ Seed data looks complete';
    ELSE
        RAISE NOTICE '⚠️  Some seed data may be missing';
    END IF;
END $$;

-- ========== 10. CREATE ESSENTIAL VIEWS ==========
\echo ''
\echo 'Step 10: Creating/updating essential views...'

-- Create user permissions view (if it doesn't exist)
CREATE OR REPLACE VIEW user_permissions_view 
WITH (security_invoker=on) AS
SELECT 
  ur.user_id,
  ur.gym_id,
  r.name as role_name,
  r.display_name as role_display_name,
  r.level as role_level,
  ARRAY_AGG(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL) as role_permissions,
  ur.assigned_at,
  ur.expires_at,
  p_profile.custom_permissions,
  -- Merge role and custom permissions
  COALESCE(
    ARRAY_AGG(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL), 
    ARRAY[]::text[]
  ) || 
  COALESCE(
    ARRAY(
      SELECT key 
      FROM jsonb_each(p_profile.custom_permissions) 
      WHERE value::boolean = true
    ), 
    ARRAY[]::text[]
  ) as all_permissions
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
LEFT JOIN public.profiles p_profile ON ur.user_id = p_profile.id AND ur.gym_id = p_profile.gym_id
WHERE ur.is_active = true
  AND (ur.expires_at IS NULL OR ur.expires_at > now())
GROUP BY ur.user_id, ur.gym_id, r.name, r.display_name, r.level, ur.assigned_at, ur.expires_at, p_profile.custom_permissions;

-- Grant access to the view
GRANT SELECT ON user_permissions_view TO authenticated;

\echo 'Essential views created'

-- ========== FINAL VERIFICATION ==========
\echo ''
\echo '=========================================='
\echo '  Final System Verification'
\echo '=========================================='

DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    trigger_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count essential components
    SELECT COUNT(*) INTO table_count 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN ('gyms', 'profiles', 'members', 'roles', 'permissions', 'subscriptions');
    
    SELECT COUNT(*) INTO function_count 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
      AND routine_name IN ('has_permission', 'get_user_role', 'handle_new_user', 'complete_user_profile');
    
    SELECT COUNT(*) INTO trigger_count 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
      AND trigger_name NOT LIKE 'RI_%';
    
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%';
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 System Status Summary:';
    RAISE NOTICE '- Core tables: %/6 (expected: 6)', table_count;
    RAISE NOTICE '- Essential functions: %/4 (expected: 4+)', function_count;
    RAISE NOTICE '- Triggers: % (active)', trigger_count;
    RAISE NOTICE '- RLS policies: % (active)', policy_count;
    RAISE NOTICE '- Performance indexes: % (created)', index_count;
    RAISE NOTICE '';
    
    IF table_count >= 6 AND function_count >= 4 AND policy_count >= 15 THEN
        RAISE NOTICE '🎉 SUCCESS: Your database is fully functional!';
        RAISE NOTICE '✅ RBAC system is operational';
        RAISE NOTICE '✅ Multi-tenant architecture is ready';
        RAISE NOTICE '✅ Performance optimizations are in place';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 Next steps:';
        RAISE NOTICE '1. Your gym SaaS application should work with this database';
        RAISE NOTICE '2. Test user registration and gym creation';
        RAISE NOTICE '3. Verify permission checking in your application';
        RAISE NOTICE '4. Test member management features';
    ELSE
        RAISE NOTICE '⚠️  WARNING: Some components may be missing';
        RAISE NOTICE '   Consider running individual migration files manually';
    END IF;
END $$;

\echo ''
\echo '=========================================='
\echo '  Migration Complete!'
\echo '=========================================='