-- 23. SECURE VIEWS WITH SECURITY INVOKER

-- Drop existing view that runs with security definer privileges
DROP VIEW IF EXISTS user_permissions_view;

-- Recreate view with security_invoker=on to run with querying user's privileges
CREATE OR REPLACE VIEW user_permissions_view 
WITH (security_invoker=on) AS
SELECT 
  ur.user_id,
  ur.gym_id,
  r.name as role_name,
  r.level as role_level,
  ARRAY_AGG(p.name) as permissions
FROM public.user_roles ur
JOIN public.roles r ON ur.role_id = r.id
LEFT JOIN public.role_permissions rp ON r.id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.id
WHERE ur.is_active = true
GROUP BY ur.user_id, ur.gym_id, r.name, r.level;

-- Enable RLS on the view
ALTER VIEW user_permissions_view SET (security_invoker=on);

-- Create RLS policy for the view to ensure users only see appropriate data
CREATE POLICY "Users can view own permissions and gym permissions they manage" ON public.user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR -- Own permissions
    -- Can view permissions for gyms they manage (manager level or above)
    gym_id IN (
      SELECT ur.gym_id 
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid() 
        AND ur.is_active = true 
        AND r.level >= 75 -- Manager level and above
    )
  );

-- Grant access to the view for authenticated users
GRANT SELECT ON user_permissions_view TO authenticated;

-- Add comment explaining the security configuration
COMMENT ON VIEW user_permissions_view IS 'View showing user permissions with security_invoker=on for proper access control. Users can only see their own permissions or permissions within gyms they manage.';