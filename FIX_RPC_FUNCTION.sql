-- ========= FIX RPC FUNCTION FOR SUPABASE CLIENT ACCESS =========
-- This fixes the "schema must be one of the following: api" error

-- 1. Drop the existing function first
DROP FUNCTION IF EXISTS public.complete_user_profile(uuid, text);

-- 2. Recreate the function with proper RPC permissions
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
  -- Validate input parameters
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF gym_name IS NULL OR trim(gym_name) = '' THEN
    RAISE EXCEPTION 'gym_name cannot be null or empty';
  END IF;
  
  -- Create gym with current user as owner
  INSERT INTO public.gyms (name, owner_id, created_at, updated_at)
  VALUES (trim(gym_name), user_id, NOW(), NOW())
  RETURNING id INTO new_gym_id;
  
  -- Verify gym was created
  IF new_gym_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create gym';
  END IF;

  -- Update profile with gym association
  UPDATE public.profiles
  SET gym_id = new_gym_id, updated_at = NOW()
  WHERE id = user_id;
  
  -- Verify profile was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update profile - user not found';
  END IF;
  
  -- Return the new gym ID for reference
  RETURN new_gym_id;
END;
$$;

-- 3. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO anon;

-- 4. Also ensure the function can be called via RPC by granting to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.complete_user_profile(uuid, text) TO supabase_auth_admin;

-- 5. Alternative: Create a simpler version that returns void if the UUID return is causing issues
CREATE OR REPLACE FUNCTION public.complete_user_profile_simple(
  user_id uuid,
  gym_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_gym_id uuid;
BEGIN
  -- Validate input parameters
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  
  IF gym_name IS NULL OR trim(gym_name) = '' THEN
    RAISE EXCEPTION 'gym_name cannot be null or empty';
  END IF;
  
  -- Create gym with current user as owner
  INSERT INTO public.gyms (name, owner_id, created_at, updated_at)
  VALUES (trim(gym_name), user_id, NOW(), NOW())
  RETURNING id INTO new_gym_id;
  
  -- Verify gym was created
  IF new_gym_id IS NULL THEN
    RAISE EXCEPTION 'Failed to create gym';
  END IF;

  -- Update profile with gym association
  UPDATE public.profiles
  SET gym_id = new_gym_id, updated_at = NOW()
  WHERE id = user_id;
  
  -- Verify profile was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update profile - user not found';
  END IF;
END;
$$;

-- Grant permissions for the simple version too
GRANT EXECUTE ON FUNCTION public.complete_user_profile_simple(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_user_profile_simple(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.complete_user_profile_simple(uuid, text) TO supabase_auth_admin;

-- 6. Verify the functions exist and have correct permissions
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%complete_user_profile%';

-- 7. Test the function (uncomment to test with your actual user ID)
-- SELECT public.complete_user_profile('your-user-id-here', 'Test Gym Name'); 