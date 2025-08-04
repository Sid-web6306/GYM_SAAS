-- 20. UPDATE PROFILES TABLE FOR RBAC

-- Add RBAC-related fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_role text DEFAULT 'owner' CHECK (default_role IN ('owner', 'manager', 'staff', 'trainer', 'member')),
ADD COLUMN IF NOT EXISTS custom_permissions jsonb DEFAULT '{}', -- Additional permissions beyond role
ADD COLUMN IF NOT EXISTS is_gym_owner boolean DEFAULT false, -- Quick lookup for gym ownership
ADD COLUMN IF NOT EXISTS last_role_sync timestamptz DEFAULT now(); -- Track when roles were last synced

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_gym_owner ON public.profiles(gym_id) WHERE is_gym_owner = true;
CREATE INDEX IF NOT EXISTS idx_profiles_default_role ON public.profiles(default_role);

-- Update existing profiles to mark gym owners
UPDATE public.profiles 
SET is_gym_owner = true, default_role = 'owner'
FROM public.gyms 
WHERE public.profiles.id = public.gyms.owner_id;

-- Create function to automatically assign owner role when gym is created
CREATE OR REPLACE FUNCTION assign_gym_owner_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile to mark as gym owner
  UPDATE public.profiles 
  SET is_gym_owner = true, 
      default_role = 'owner',
      last_role_sync = now()
  WHERE id = NEW.owner_id;
  
  -- Insert owner role in user_roles table
  INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
  SELECT 
    NEW.owner_id,
    r.id,
    NEW.id,
    NEW.owner_id, -- Self-assigned
    now()
  FROM public.roles r
  WHERE r.name = 'owner'
  ON CONFLICT (user_id, gym_id) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    updated_at = now(),
    is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign owner role
CREATE TRIGGER trigger_assign_gym_owner_role
  AFTER INSERT ON public.gyms
  FOR EACH ROW
  EXECUTE FUNCTION assign_gym_owner_role();

-- Create function to sync user roles when profile is updated
CREATE OR REPLACE FUNCTION sync_user_role_on_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If gym_id changed or default_role changed, update user_roles
  IF (OLD.gym_id IS DISTINCT FROM NEW.gym_id) OR (OLD.default_role IS DISTINCT FROM NEW.default_role) THEN
    
    -- If gym_id changed, deactivate old role
    IF OLD.gym_id IS DISTINCT FROM NEW.gym_id AND OLD.gym_id IS NOT NULL THEN
      UPDATE public.user_roles 
      SET is_active = false, updated_at = now()
      WHERE user_id = NEW.id AND gym_id = OLD.gym_id;
    END IF;
    
    -- If user has a gym and a role, ensure user_roles entry exists
    IF NEW.gym_id IS NOT NULL AND NEW.default_role IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
      SELECT 
        NEW.id,
        r.id,
        NEW.gym_id,
        NEW.id, -- Self-assigned for profile updates
        now()
      FROM public.roles r
      WHERE r.name = NEW.default_role
      ON CONFLICT (user_id, gym_id) DO UPDATE SET
        role_id = EXCLUDED.role_id,
        updated_at = now(),
        is_active = true;
    END IF;
    
    -- Update last_role_sync timestamp
    NEW.last_role_sync = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile updates
CREATE TRIGGER trigger_sync_user_role_on_profile_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_on_profile_update();

-- Migrate existing data: create user_roles entries for existing profiles
INSERT INTO public.user_roles (user_id, role_id, gym_id, assigned_by, assigned_at)
SELECT 
  p.id,
  r.id,
  p.gym_id,
  p.id, -- Self-assigned during migration
  p.created_at
FROM public.profiles p
JOIN public.roles r ON r.name = p.default_role
WHERE p.gym_id IS NOT NULL
ON CONFLICT (user_id, gym_id) DO NOTHING;