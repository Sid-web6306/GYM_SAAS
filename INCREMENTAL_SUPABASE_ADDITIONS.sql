-- ========= INCREMENTAL ADDITIONS TO COMPLETE YOUR SETUP =========
-- Run these commands to add missing components to your existing setup

-- 1. ADD MISSING COLUMNS
-- Add owner_id to gyms table (important for proper permissions)
ALTER TABLE public.gyms ADD COLUMN owner_id uuid REFERENCES auth.users(id) NOT NULL DEFAULT auth.uid();

-- Add updated_at columns for change tracking
ALTER TABLE public.gyms ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.members ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Add missing member columns
ALTER TABLE public.members ADD COLUMN membership_type text DEFAULT 'basic';
ALTER TABLE public.members ADD COLUMN full_name text GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- Add constraints for data integrity
ALTER TABLE public.members ADD CONSTRAINT members_status_check 
  CHECK (status IN ('active', 'inactive', 'pending', 'suspended'));

-- 2. CREATE PERFORMANCE INDEXES
CREATE INDEX idx_profiles_gym_id ON public.profiles(gym_id);
CREATE INDEX idx_members_gym_id ON public.members(gym_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_email ON public.members(email);
CREATE INDEX idx_members_created_at ON public.members(created_at);
CREATE INDEX idx_gyms_owner_id ON public.gyms(owner_id);

-- 3. ADD UPDATED_AT TRIGGERS
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gyms_updated_at BEFORE UPDATE ON public.gyms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. IMPROVE RLS POLICIES
-- Drop existing policies to recreate them with better logic
DROP POLICY IF EXISTS "Users can view their own gym." ON public.gyms;
DROP POLICY IF EXISTS "Users can manage members of their own gym." ON public.members;

-- Enhanced gym policies
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

-- Enhanced member policies with all CRUD operations
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

-- 5. IMPROVE THE USER CREATION FUNCTION
-- Enhanced function with better social auth support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Extract name from social metadata or email
  user_email := NEW.email;
  
  -- Try to get full name from social metadata
  IF NEW.raw_user_meta_data ? 'full_name' THEN
    user_full_name := NEW.raw_user_meta_data->>'full_name';
  ELSIF NEW.raw_user_meta_data ? 'name' THEN
    user_full_name := NEW.raw_user_meta_data->>'name';
  ELSE
    -- Fallback to email username
    user_full_name := SPLIT_PART(user_email, '@', 1);
  END IF;

  -- Insert profile with social data
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

-- 6. ENHANCE COMPLETE_USER_PROFILE FUNCTION
-- Drop the existing function first to change return type
DROP FUNCTION IF EXISTS public.complete_user_profile(uuid, text);

CREATE OR REPLACE FUNCTION public.complete_user_profile(
  user_id uuid,
  gym_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  new_gym_id uuid;
BEGIN
  -- Create gym with current user as owner
  INSERT INTO public.gyms (name, owner_id, created_at, updated_at)
  VALUES (gym_name, user_id, NOW(), NOW())
  RETURNING id INTO new_gym_id;

  -- Update profile with gym association
  UPDATE public.profiles
  SET gym_id = new_gym_id, updated_at = NOW()
  WHERE id = user_id;
  
  -- Return the new gym ID for reference
  RETURN new_gym_id;
END;
$$;

-- 7. ENABLE REAL-TIME (Optional but recommended)
-- Enable realtime for authenticated users on their data
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gyms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.members;

-- 8. CREATE ANALYTICS VIEW (Optional for dashboard)
CREATE MATERIALIZED VIEW gym_analytics AS
SELECT 
  g.id as gym_id,
  g.name as gym_name,
  g.owner_id,
  COUNT(m.id) as total_members,
  COUNT(CASE WHEN m.status = 'active' THEN 1 END) as active_members,
  COUNT(CASE WHEN m.join_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_members_30d,
  g.created_at as gym_created,
  MAX(m.created_at) as last_member_added
FROM public.gyms g
LEFT JOIN public.members m ON g.id = m.gym_id
GROUP BY g.id, g.name, g.owner_id, g.created_at;

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_gym_analytics()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW gym_analytics;
END;
$$ LANGUAGE plpgsql;

-- 9. ADD HELPFUL UTILITY FUNCTIONS
-- Function to check if user has access to a gym
CREATE OR REPLACE FUNCTION check_user_gym_access(target_gym_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.gyms 
    WHERE id = target_gym_id 
    AND (owner_id = auth.uid() OR id IN (
      SELECT gym_id FROM public.profiles WHERE id = auth.uid()
    ))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's gym ID
CREATE OR REPLACE FUNCTION get_user_gym_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT gym_id FROM public.profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. VERIFICATION QUERIES
-- Run these to verify your setup is working correctly

-- Check if all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'gyms', 'members');

-- Check all policies are created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check all indexes are created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'gyms', 'members');

-- Test data insertion (replace with your actual user ID)
-- INSERT INTO public.gyms (name, owner_id) VALUES ('Test Gym', auth.uid());

COMMENT ON SCHEMA public IS 'Gym SaaS MVP Database - Production Ready Setup Complete'; 