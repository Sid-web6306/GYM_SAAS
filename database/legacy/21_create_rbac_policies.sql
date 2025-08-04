-- 21. CREATE RBAC POLICIES

-- ========== ROLES TABLE POLICIES ==========

-- Allow authenticated users to read all roles (for dropdowns, etc.)
CREATE POLICY "Authenticated users can view all roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

-- Only system/super admins can modify system roles (future enhancement)
-- For now, roles are read-only via policies

-- ========== PERMISSIONS TABLE POLICIES ==========

-- Allow authenticated users to read all permissions (for UI/reference)
CREATE POLICY "Authenticated users can view all permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

-- ========== ROLE_PERMISSIONS TABLE POLICIES ==========

-- Allow authenticated users to read role-permission mappings
CREATE POLICY "Authenticated users can view role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- ========== USER_ROLES TABLE POLICIES ==========

-- Users can view their own roles across all gyms they have access to
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR
    -- Gym owners and managers can view roles within their gym
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

-- Gym owners and managers can assign/modify roles within their gym
CREATE POLICY "Gym owners and managers can manage user roles" ON public.user_roles
  FOR ALL USING (
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    -- Can only assign roles within gyms they manage
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true
        AND r.name IN ('owner', 'manager')
    )
    AND
    -- Cannot assign roles higher than their own
    role_id IN (
      SELECT r.id FROM public.roles r
      WHERE r.level <= (
        SELECT MAX(r2.level)
        FROM public.user_roles ur2
        JOIN public.roles r2 ON ur2.role_id = r2.id
        WHERE ur2.user_id = auth.uid() 
          AND ur2.gym_id = user_roles.gym_id
          AND ur2.is_active = true
      )
    )
  );

-- System can insert user roles during registration/profile updates
CREATE POLICY "System can manage user roles during profile operations" ON public.user_roles
  FOR INSERT WITH CHECK (
    -- Allow if it's the user assigning themselves a role (during profile update)
    assigned_by = auth.uid() AND user_id = auth.uid()
  );

-- ========== HELPER FUNCTIONS FOR RBAC ==========

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
  gym_UUID uuid
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