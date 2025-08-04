-- 00. SCHEMA COMPATIBILITY
-- This migration adds missing columns to existing tables to make them compatible
-- with our consolidated migration system

\echo '=========================================='
\echo '  Schema Compatibility Migration'
\echo '=========================================='

-- ========== ADD MISSING COLUMNS TO GYMS TABLE ==========

-- Add missing columns to gyms table
ALTER TABLE public.gyms 
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

\echo 'Added missing columns to gyms table'

-- ========== VERIFY PROFILES TABLE RBAC FIELDS ==========

-- Profiles table already has RBAC fields based on analysis, but let's ensure they exist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_role text DEFAULT 'owner' CHECK (default_role IN ('owner', 'manager', 'staff', 'trainer', 'member')),
  ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_gym_owner boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_role_sync timestamptz DEFAULT now();

\echo 'Verified RBAC fields in profiles table'

-- ========== CHECK AND CREATE MISSING INDEXES ==========

-- Create indexes that might be missing (IF NOT EXISTS prevents errors)
CREATE INDEX IF NOT EXISTS idx_gyms_active ON public.gyms(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gyms_owner ON public.gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gym_owner ON public.profiles(gym_id) WHERE is_gym_owner = true;
CREATE INDEX IF NOT EXISTS idx_profiles_default_role ON public.profiles(default_role);

\echo 'Added missing indexes'

-- ========== ENSURE SUBSCRIPTION PLANS EXIST ==========

-- Insert subscription plans if they don't exist (the ON CONFLICT prevents duplicates)
INSERT INTO public.subscription_plans (
  id,
  name, 
  display_name, 
  description, 
  price_monthly, 
  price_yearly, 
  currency,
  features,
  max_members,
  max_staff,
  is_active,
  is_popular,
  sort_order
) VALUES
  (
    '10000000-1000-1000-1000-100000000001',
    'starter', 
    'Starter Plan', 
    'Perfect for small gyms getting started', 
    299900, -- ₹2,999 in paise
    2999000, -- ₹29,990 yearly (17% discount)
    'INR',
    '["Up to 100 members", "Basic analytics", "Member check-ins", "Email support", "Mobile app access"]'::jsonb,
    100,
    2,
    true,
    false,
    1
  ),
  (
    '10000000-1000-1000-1000-100000000002',
    'professional', 
    'Professional Plan', 
    'Advanced features for growing gyms', 
    599900, -- ₹5,999 in paise
    5999000, -- ₹59,990 yearly (17% discount)
    'INR',
    '["Up to 500 members", "Advanced analytics", "Staff management", "Custom reports", "API access", "Priority support", "Multi-location support"]'::jsonb,
    500,
    10,
    true,
    true,
    2
  ),
  (
    '10000000-1000-1000-1000-100000000003',
    'enterprise', 
    'Enterprise Plan', 
    'Complete solution for large gym chains', 
    1199900, -- ₹11,999 in paise
    11999000, -- ₹119,990 yearly (17% discount)
    'INR',
    '["Unlimited members", "Full analytics suite", "Advanced staff management", "Custom integrations", "Dedicated support", "White-label options", "Advanced reporting", "Multi-tenant management"]'::jsonb,
    -1, -- Unlimited
    -1, -- Unlimited
    true,
    false,
    3
  )
ON CONFLICT (id) DO NOTHING;

\echo 'Ensured subscription plans exist'

-- ========== VERIFY ROLE PERMISSIONS ARE COMPLETE ==========

-- Check if we have all the permissions we need
DO $$
DECLARE
    permission_count INTEGER;
    role_permission_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO permission_count FROM public.permissions;
    SELECT COUNT(*) INTO role_permission_count FROM public.role_permissions;
    
    -- If we have fewer permissions than expected, we'll need to run seed data
    IF permission_count < 17 THEN
        RAISE NOTICE 'Permission count is %, expected at least 17. Will need to run seed data migration.', permission_count;
    ELSE
        RAISE NOTICE 'Permission system looks complete with % permissions', permission_count;
    END IF;
    
    IF role_permission_count < 20 THEN
        RAISE NOTICE 'Role-permission mappings count is %, expected at least 20. Will need to run seed data migration.', role_permission_count;
    ELSE
        RAISE NOTICE 'Role-permission mappings look complete with % mappings', role_permission_count;
    END IF;
END $$;

-- ========== UPDATE EXISTING RECORDS ==========

-- Ensure existing gyms have the is_active field set to true
UPDATE public.gyms 
SET is_active = true 
WHERE is_active IS NULL;

-- Ensure existing profiles have proper RBAC defaults
UPDATE public.profiles 
SET 
  default_role = COALESCE(default_role, 'owner'),
  custom_permissions = COALESCE(custom_permissions, '{}'),
  is_gym_owner = COALESCE(is_gym_owner, false),
  last_role_sync = COALESCE(last_role_sync, now())
WHERE default_role IS NULL 
   OR custom_permissions IS NULL 
   OR is_gym_owner IS NULL 
   OR last_role_sync IS NULL;

\echo 'Updated existing records with proper defaults'

-- ========== VERIFICATION ==========

DO $$
DECLARE
    gym_columns INTEGER;
    profile_rbac_columns INTEGER;
BEGIN
    -- Count expected columns in gyms table
    SELECT COUNT(*) INTO gym_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'gyms'
      AND column_name IN ('is_active', 'description', 'address', 'phone', 'email', 'website', 'logo_url', 'settings');
    
    -- Count RBAC columns in profiles table
    SELECT COUNT(*) INTO profile_rbac_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name IN ('default_role', 'custom_permissions', 'is_gym_owner', 'last_role_sync');
    
    RAISE NOTICE '';
    RAISE NOTICE 'Schema Compatibility Check:';
    RAISE NOTICE '- Gyms table new columns: %/8 (expected: 8)', gym_columns;
    RAISE NOTICE '- Profiles RBAC columns: %/4 (expected: 4)', profile_rbac_columns;
    
    IF gym_columns = 8 AND profile_rbac_columns = 4 THEN
        RAISE NOTICE '✅ Schema compatibility migration SUCCESSFUL';
        RAISE NOTICE '   Database is now compatible with consolidated migrations';
    ELSE
        RAISE NOTICE '❌ Schema compatibility migration INCOMPLETE';
        RAISE NOTICE '   Some columns may be missing';
    END IF;
END $$;

\echo ''
\echo '=========================================='
\echo '  Schema Compatibility Complete'
\echo '=========================================='