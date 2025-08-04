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
  has_perm boolean := false;
BEGIN
  -- Check if user has the permission through their role
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
      AND ur.gym_id = gym_uuid
      AND ur.is_active = true
      AND p.name = permission_name
  ) INTO has_perm;
  
  -- If not found through role, check custom permissions in profile
  IF NOT has_perm THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles prof
      WHERE prof.id = user_uuid
        AND prof.gym_id = gym_uuid
        AND prof.custom_permissions ? permission_name
        AND (prof.custom_permissions->permission_name)::boolean = true
    ) INTO has_perm;
  END IF;
  
  RETURN has_perm;
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
  SELECT r.name INTO role_name
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_uuid
    AND ur.gym_id = gym_uuid
    AND ur.is_active = true;
    
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