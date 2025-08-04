-- 09. INSERT SEED DATA
-- Essential data for RBAC system and subscription plans

-- ========== INSERT PREDEFINED ROLES ==========

INSERT INTO public.roles (id, name, display_name, description, level, is_system_role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Gym Owner', 'Full access to all gym features and settings', 100, true),
  ('00000000-0000-0000-0000-000000000002', 'manager', 'Manager', 'Manage members, staff, and day-to-day operations', 75, true),
  ('00000000-0000-0000-0000-000000000003', 'staff', 'Staff Member', 'Access to member management and basic features', 50, true),
  ('00000000-0000-0000-0000-000000000004', 'member', 'Member', 'Limited access to personal information and activities', 25, true),
  ('00000000-0000-0000-0000-000000000005', 'trainer', 'Personal Trainer', 'Access to assigned members and training features', 60, true)
ON CONFLICT (id) DO NOTHING;

-- ========== INSERT PREDEFINED PERMISSIONS ==========

INSERT INTO public.permissions (name, display_name, description, resource, action) VALUES
  -- Member Management
  ('members.create', 'Create Members', 'Add new members to the gym', 'members', 'create'),
  ('members.read', 'View Members', 'View member list and details', 'members', 'read'),
  ('members.update', 'Update Members', 'Edit member information', 'members', 'update'),
  ('members.delete', 'Delete Members', 'Remove members from the gym', 'members', 'delete'),
  
  -- Analytics & Reports
  ('analytics.read', 'View Analytics', 'Access gym analytics and reports', 'analytics', 'read'),
  ('analytics.export', 'Export Reports', 'Export analytics data and reports', 'analytics', 'export'),
  
  -- Gym Settings
  ('gym.read', 'View Gym Info', 'View gym information and settings', 'gym', 'read'),
  ('gym.update', 'Update Gym', 'Modify gym settings and information', 'gym', 'update'),
  
  -- Staff Management
  ('staff.create', 'Add Staff', 'Invite new staff members', 'staff', 'create'),
  ('staff.read', 'View Staff', 'View staff list and roles', 'staff', 'read'),
  ('staff.update', 'Manage Staff', 'Update staff roles and permissions', 'staff', 'update'),
  ('staff.delete', 'Remove Staff', 'Remove staff members', 'staff', 'delete'),
  
  -- Financial
  ('billing.read', 'View Billing', 'Access billing information', 'billing', 'read'),
  ('billing.update', 'Manage Billing', 'Update billing and subscription settings', 'billing', 'update'),
  
  -- Member Activities
  ('activities.create', 'Log Activities', 'Record member activities and check-ins', 'activities', 'create'),
  ('activities.read', 'View Activities', 'View member activities and check-ins', 'activities', 'read'),
  ('activities.update', 'Update Activities', 'Modify activity records', 'activities', 'update'),
  ('activities.delete', 'Delete Activities', 'Remove activity records', 'activities', 'delete'),
  
  -- Personal Data (for members)
  ('profile.read', 'View Own Profile', 'View personal profile information', 'profile', 'read'),
  ('profile.update', 'Update Own Profile', 'Update personal profile information', 'profile', 'update')
ON CONFLICT (name) DO NOTHING;

-- ========== ASSIGN PERMISSIONS TO ROLES ==========

-- Owner gets all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'owner' -- Owner gets all permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'manager' AND p.name IN (
  'members.create', 'members.read', 'members.update', 'members.delete',
  'analytics.read', 'analytics.export',
  'gym.read',
  'staff.read',
  'activities.create', 'activities.read', 'activities.update', 'activities.delete'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'staff' AND p.name IN (
  'members.create', 'members.read', 'members.update',
  'gym.read',
  'activities.create', 'activities.read', 'activities.update'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Trainer permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'trainer' AND p.name IN (
  'members.read', 'members.update',
  'gym.read',
  'activities.create', 'activities.read', 'activities.update'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Member permissions (very limited)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.name = 'member' AND p.name IN (
  'profile.read', 'profile.update',
  'activities.read'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========== INSERT SUBSCRIPTION PLANS ==========

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

-- ========== INSERT SAMPLE GYM METRICS DATA ==========
-- This creates initial metrics structure for new gyms

-- Note: Actual gym metrics will be populated by triggers and functions
-- This is just to establish the table structure with sample data types

-- ========== INITIAL SYSTEM CONFIGURATION ==========

-- Insert system-wide settings (could be used for feature flags, etc.)
-- This could be extended later for system-wide configuration

-- ========== DEVELOPMENT/TESTING DATA ==========
-- Only insert if in development environment
-- Uncomment the following section for development/testing

/*
-- Sample gym for development (only if not in production)
DO $$
BEGIN
  IF current_setting('app.environment', true) = 'development' THEN
    
    -- Insert a sample gym owner user (this would normally be created via auth)
    -- Note: In real usage, users are created through Supabase Auth
    
    -- Insert sample gym
    INSERT INTO public.gyms (
      id,
      name,
      description,
      address,
      phone,
      email,
      owner_id,
      created_at
    ) VALUES (
      '20000000-2000-2000-2000-200000000001',
      'Demo Fitness Center',
      'A sample gym for development and testing',
      '123 Main Street, Demo City, DC 12345',
      '+1-555-0123',
      'demo@example.com',
      '30000000-3000-3000-3000-300000000001', -- Sample user ID
      now()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Insert sample members
    INSERT INTO public.members (
      gym_id,
      full_name,
      email,
      phone,
      membership_type,
      status,
      created_by
    ) VALUES 
      (
        '20000000-2000-2000-2000-200000000001',
        'John Doe',
        'john.doe@example.com',
        '+1-555-0100',
        'premium',
        'active',
        '30000000-3000-3000-3000-300000000001'
      ),
      (
        '20000000-2000-2000-2000-200000000001',
        'Jane Smith', 
        'jane.smith@example.com',
        '+1-555-0101',
        'basic',
        'active',
        '30000000-3000-3000-3000-300000000001'
      ) ON CONFLICT (gym_id, email) DO NOTHING;
      
  END IF;
END $$;
*/

-- ========== GRANTS AND PERMISSIONS ==========

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;
GRANT SELECT ON public.subscription_plans TO authenticated;

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ========== FINAL VERIFICATION ==========

-- Verify that all roles have at least one permission
DO $$
DECLARE
  role_count INTEGER;
  permission_count INTEGER;
  role_permission_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO role_count FROM public.roles;
  SELECT COUNT(*) INTO permission_count FROM public.permissions;
  SELECT COUNT(*) INTO role_permission_count FROM public.role_permissions;
  
  RAISE NOTICE 'Seed data verification:';
  RAISE NOTICE '- Roles created: %', role_count;
  RAISE NOTICE '- Permissions created: %', permission_count;
  RAISE NOTICE '- Role-permission mappings: %', role_permission_count;
  
  IF role_count < 5 THEN
    RAISE EXCEPTION 'Expected at least 5 roles, got %', role_count;
  END IF;
  
  IF permission_count < 17 THEN
    RAISE EXCEPTION 'Expected at least 17 permissions, got %', permission_count;
  END IF;
  
  IF role_permission_count < 20 THEN
    RAISE EXCEPTION 'Expected at least 20 role-permission mappings, got %', role_permission_count;
  END IF;
  
  RAISE NOTICE 'Seed data inserted successfully!';
END $$;