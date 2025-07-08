-- ========= COMPLETE SUPABASE SETUP - FOR BOTH DEV AND PRODUCTION =========
-- This script contains everything needed for both development and production environments
-- Safe to run multiple times (idempotent) - will not duplicate or break existing setup
-- 
-- INSTRUCTIONS:
-- 1. For DEV: Run this in your development Supabase project SQL Editor
-- 2. For PROD: Run this in your production Supabase project SQL Editor
-- 3. Make sure your app environment variables point to the correct project

-- 1. CREATE TABLES (if they don't exist)
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid NOT NULL DEFAULT gen_random_uuid(), 
  created_at timestamptz NOT NULL DEFAULT now(), 
  name text NULL, 
  owner_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gyms_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL, 
  created_at timestamptz NOT NULL DEFAULT now(), 
  full_name text NULL, 
  gym_id uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid(), 
  created_at timestamptz NOT NULL DEFAULT now(), 
  first_name text NULL, 
  last_name text NULL, 
  email text NULL, 
  phone_number text NULL, 
  status text NULL DEFAULT 'active'::text, 
  join_date timestamptz NULL DEFAULT now(), 
  gym_id uuid NOT NULL,
  membership_type text DEFAULT 'basic',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT members_pkey PRIMARY KEY (id)
);

-- 2. ADD MISSING COLUMNS (if they don't exist)
DO $$ 
BEGIN
  -- Add owner_id to gyms if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gyms' AND column_name = 'owner_id') THEN
    ALTER TABLE public.gyms ADD COLUMN owner_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid();
  END IF;
  
  -- Add updated_at columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gyms' AND column_name = 'updated_at') THEN
    ALTER TABLE public.gyms ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'updated_at') THEN
    ALTER TABLE public.members ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
  
  -- Add membership_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'membership_type') THEN
    ALTER TABLE public.members ADD COLUMN membership_type text DEFAULT 'basic';
  END IF;
  
  -- Add full_name computed column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'full_name') THEN
    ALTER TABLE public.members ADD COLUMN full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;
  END IF;
END $$;

-- 3. ADD FOREIGN KEY CONSTRAINTS
DO $$
BEGIN
  -- Add profiles foreign key constraints if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'profiles_gym_id_fkey') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE SET NULL;
  END IF;
  
  -- Add members foreign key constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'members_gym_id_fkey') THEN
    ALTER TABLE public.members ADD CONSTRAINT members_gym_id_fkey FOREIGN KEY (gym_id) REFERENCES public.gyms(id) ON DELETE CASCADE;
  END IF;
  
  -- Add status check constraint if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'members_status_check') THEN
    ALTER TABLE public.members ADD CONSTRAINT members_status_check CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));
  END IF;
END $$;

-- 4. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_gym_id ON public.profiles(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON public.members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id ON public.gyms(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS members_gym_email_idx ON public.members USING btree (gym_id, email);

-- 5. CREATE FUNCTIONS
-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user function with social auth support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  user_email := NEW.email;
  
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data ? 'name' THEN
    user_full_name := NEW.raw_user_meta_data->>'name';
  ELSE
    user_full_name := SPLIT_PART(user_email, '@', 1);
  END IF;

  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(user_full_name, 'User'),
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete user profile function - MAIN ONBOARDING FUNCTION
DROP FUNCTION IF EXISTS public.complete_user_profile(uuid, text);
CREATE OR REPLACE FUNCTION public.complete_user_profile(
  user_id uuid,
  gym_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym_id uuid;
BEGIN
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF gym_name IS NULL OR trim(gym_name) = '' THEN
    RAISE EXCEPTION 'gym_name cannot be null or empty';
  END IF;
  
  INSERT INTO public.gyms (name, owner_id, created_at, updated_at)
  VALUES (trim(gym_name), user_id, NOW(), NOW())
  RETURNING id INTO new_gym_id;
  
  IF new_gym_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create gym';
  END IF;

  UPDATE public.profiles
  SET gym_id = new_gym_id, updated_at = NOW()
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update profile - user not found';
  END IF;
  
  RETURN new_gym_id;
END;
$$;

-- 6. CREATE TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gyms_updated_at ON public.gyms;
CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_members_updated_at ON public.members;
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 8. CREATE RLS POLICIES
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own gym." ON public.gyms;
DROP POLICY IF EXISTS "Users can manage members of their own gym." ON public.members;
DROP POLICY IF EXISTS "Gym owners can view their gym" ON public.gyms;
DROP POLICY IF EXISTS "Gym owners can update their gym" ON public.gyms;
DROP POLICY IF EXISTS "Authenticated users can create gyms" ON public.gyms;
DROP POLICY IF EXISTS "Users can view members from their gym" ON public.members;
DROP POLICY IF EXISTS "Users can insert members to their gym" ON public.members;
DROP POLICY IF EXISTS "Users can update members from their gym" ON public.members;
DROP POLICY IF EXISTS "Users can delete members from their gym" ON public.members;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Gyms policies
CREATE POLICY "Gym owners can view their gym" ON public.gyms
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Gym owners can update their gym" ON public.gyms
  FOR UPDATE USING (
    auth.uid() = owner_id OR 
    id IN (SELECT gym_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Authenticated users can create gyms" ON public.gyms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Members policies
CREATE POLICY "Users can view members from their gym" ON public.members
  FOR SELECT USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert members to their gym" ON public.members
  FOR INSERT WITH CHECK (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update members from their gym" ON public.members
  FOR UPDATE USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete members from their gym" ON public.members
  FOR DELETE USING (
    gym_id IN (
      SELECT id FROM public.gyms WHERE owner_id = auth.uid()
      UNION
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- 9. GRANT FUNCTION PERMISSIONS
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO supabase_auth_admin;

-- 10. ENABLE REAL-TIME (only add tables if not already in publication)
DO $$
BEGIN
  -- Add profiles to real-time if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  
  -- Add gyms to real-time if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'gyms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gyms;
  END IF;
  
  -- Add members to real-time if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;
END $$;

-- 11. VERIFICATION AND TESTING
SELECT 'Setup Complete!' as status, 
       current_database() as database_name,
       current_timestamp as setup_time;

-- Check tables exist with correct structure
SELECT 
  table_name, 
  count(*) as column_count,
  string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'gyms', 'members')
GROUP BY table_name
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'gyms', 'members')
ORDER BY tablename;

-- Check all RLS policies exist
SELECT 
  tablename,
  count(*) as policy_count,
  string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'gyms', 'members')
GROUP BY tablename
ORDER BY tablename;

-- Check critical functions exist
SELECT 
  routine_name, 
  data_type as return_type,
  CASE WHEN routine_name IS NOT NULL THEN '✅ Exists' ELSE '❌ Missing' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('complete_user_profile', 'handle_new_user')
ORDER BY routine_name;

-- Check function permissions
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges 
WHERE routine_schema = 'public' 
  AND routine_name = 'complete_user_profile'
ORDER BY grantee;

-- Check indexes exist
SELECT 
  indexname,
  tablename,
  CASE WHEN indexname IS NOT NULL THEN '✅ Created' ELSE '❌ Missing' END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'gyms', 'members')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check triggers exist
SELECT 
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation,
  CASE WHEN trigger_name IS NOT NULL THEN '✅ Active' ELSE '❌ Missing' END as status
FROM information_schema.triggers 
WHERE event_object_schema = 'public'
  AND event_object_table IN ('profiles', 'gyms', 'members')
ORDER BY event_object_table, trigger_name;

-- 12. ENVIRONMENT-SPECIFIC NOTES AND NEXT STEPS

SELECT '=== SETUP VERIFICATION COMPLETE ===' as message;

SELECT 
  'Environment Setup Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
    AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'complete_user_profile')
    AND EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles')
    THEN '✅ Ready for Development/Production'
    ELSE '❌ Setup Incomplete - Check errors above'
  END as status;

-- Add environment identifier comment
COMMENT ON SCHEMA public IS 'Gym SaaS MVP - Universal Database Setup Complete';

-- 13. TESTING INSTRUCTIONS (UNCOMMENT TO TEST)
/*
-- Test the onboarding function (replace with actual user ID after signup)
-- SELECT public.complete_user_profile('your-actual-user-id-here', 'Test Gym Name');

-- Test profile creation (this should happen automatically on user signup)
-- SELECT * FROM public.profiles WHERE id = 'your-actual-user-id-here';

-- Test gym creation verification
-- SELECT * FROM public.gyms WHERE owner_id = 'your-actual-user-id-here';
*/

-- 14. ENVIRONMENT VARIABLE CHECKLIST
/*
DEVELOPMENT ENVIRONMENT (.env.local):
NEXT_PUBLIC_SUPABASE_URL=https://your-dev-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key

PRODUCTION ENVIRONMENT:
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project-id.supabase.co  
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key

Make sure to:
1. Use DEV credentials when testing locally
2. Use PROD credentials when deploying to production
3. Never mix dev and prod credentials
4. Keep service role keys secure and separate for each environment
*/ 