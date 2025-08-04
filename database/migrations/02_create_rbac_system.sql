-- 02. CREATE RBAC SYSTEM
-- Roles, permissions, and user role assignments for multi-tenant access control

-- ========== ROLES TABLE ==========
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  level integer NOT NULL DEFAULT 0, -- Higher number = more permissions
  is_system_role boolean DEFAULT true, -- System roles cannot be deleted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ========== PERMISSIONS TABLE ==========
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  resource text NOT NULL, -- e.g., 'members', 'analytics', 'settings'
  action text NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at timestamptz DEFAULT now()
);

-- ========== ROLE PERMISSIONS JUNCTION TABLE ==========
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- ========== USER ROLES TABLE (GYM-SCOPED) ==========
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  gym_id uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  expires_at timestamptz NULL, -- For temporary role assignments
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, gym_id) -- One role per user per gym
);

-- ========== ENABLE ROW LEVEL SECURITY ==========
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ========== INDEXES FOR PERFORMANCE ==========
CREATE INDEX IF NOT EXISTS idx_user_roles_user_gym ON public.user_roles(user_id, gym_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_gym ON public.user_roles(gym_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_roles_level ON public.roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- ========== RBAC HELPER FUNCTIONS ==========

-- Function to check if user has specific permission in a gym
CREATE OR REPLACE FUNCTION has_permission(
  user_uuid uuid,
  gym_uuid uuid,
  permission_name text
) RETURNS boolean AS $$
DECLARE
  user_role text;
  is_owner boolean := false;
  role_level integer := 0;
BEGIN
  -- First, safely check if user is gym owner using user_roles table
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND ur.gym_id = gym_uuid
      AND ur.is_active = true
      AND r.name = 'owner'
  ) INTO is_owner;

  -- Gym owners have all permissions
  IF is_owner THEN
    RETURN true;
  END IF;

  -- Get user's highest role level in this gym
  SELECT COALESCE(MAX(r.level), 0), MAX(r.name)
  INTO role_level, user_role
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
    AND ur.gym_id = gym_uuid
    AND ur.is_active = true;

  -- Permission checks based on role level and specific permissions
  CASE permission_name
    WHEN 'gym.read', 'gym.update' THEN
      RETURN role_level >= 75; -- Manager level (75) and above
    WHEN 'members.read', 'members.create', 'members.update' THEN
      RETURN role_level >= 50; -- Staff level (50) and above
    WHEN 'members.delete' THEN
      RETURN role_level >= 75; -- Manager level and above
    WHEN 'activities.read', 'activities.create', 'activities.update' THEN
      RETURN role_level >= 50; -- Staff level and above
    WHEN 'activities.delete' THEN
      RETURN role_level >= 75; -- Manager level and above
    WHEN 'analytics.read' THEN
      RETURN role_level >= 75; -- Manager level and above
    WHEN 'billing.read', 'billing.update' THEN
      RETURN role_level >= 75; -- Manager level and above
    WHEN 'staff.create', 'staff.read', 'staff.update', 'staff.delete' THEN
      RETURN role_level >= 75; -- Manager level and above
    ELSE
      RETURN false; -- Unknown permission denied
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's role in a specific gym
CREATE OR REPLACE FUNCTION get_user_role(
  user_uuid uuid,
  gym_uuid uuid
) RETURNS text AS $$
DECLARE
  role_name text;
BEGIN
  -- First check profile default_role to avoid circular dependency
  SELECT default_role INTO role_name
  FROM public.profiles 
  WHERE id = user_uuid AND gym_id = gym_uuid;
  
  -- If not found in profile, fall back to user_roles table
  IF role_name IS NULL THEN
    SELECT r.name INTO role_name
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND ur.gym_id = gym_uuid
      AND ur.is_active = true;
  END IF;
    
  RETURN COALESCE(role_name, 'member'); -- Default to member if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's permissions in a specific gym
CREATE OR REPLACE FUNCTION get_user_permissions(
  user_uuid uuid,
  gym_uuid uuid
) RETURNS text[] AS $$
DECLARE
  permissions text[];
  custom_perms jsonb;
BEGIN
  -- Get role-based permissions
  SELECT ARRAY_AGG(p.name) INTO permissions
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = user_uuid
    AND ur.gym_id = gym_uuid
    AND ur.is_active = true;
  
  -- Get custom permissions from profile
  SELECT custom_permissions INTO custom_perms
  FROM public.profiles 
  WHERE id = user_uuid AND gym_id = gym_uuid;
  
  -- Merge custom permissions where they are true
  IF custom_perms IS NOT NULL THEN
    SELECT permissions || ARRAY(
      SELECT key 
      FROM jsonb_each(custom_perms) 
      WHERE value::boolean = true
    ) INTO permissions;
  END IF;
  
  RETURN COALESCE(permissions, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role level access
CREATE OR REPLACE FUNCTION has_role_level(
  user_uuid uuid,
  gym_uuid uuid,
  required_level integer
) RETURNS boolean AS $$
DECLARE
  user_level integer := 0;
BEGIN
  SELECT COALESCE(MAX(r.level), 0) INTO user_level
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
    AND ur.gym_id = gym_uuid
    AND ur.is_active = true;
    
  RETURN user_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION has_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role_level(uuid, uuid, integer) TO authenticated;