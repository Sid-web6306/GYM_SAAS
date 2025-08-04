-- 19. CREATE RBAC TABLES

-- Create roles table with predefined gym roles
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

-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  resource text NOT NULL, -- e.g., 'members', 'analytics', 'settings'
  action text NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
  created_at timestamptz DEFAULT now()
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Create user_roles table for gym-scoped role assignments
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_gym ON public.user_roles(user_id, gym_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_gym ON public.user_roles(gym_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON public.permissions(resource, action);

-- Enable RLS on all RBAC tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Insert predefined roles
INSERT INTO public.roles (id, name, display_name, description, level, is_system_role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'owner', 'Gym Owner', 'Full access to all gym features and settings', 100, true),
  ('00000000-0000-0000-0000-000000000002', 'manager', 'Manager', 'Manage members, staff, and day-to-day operations', 75, true),
  ('00000000-0000-0000-0000-000000000003', 'staff', 'Staff Member', 'Access to member management and basic features', 50, true),
  ('00000000-0000-0000-0000-000000000004', 'member', 'Member', 'Limited access to personal information and activities', 25, true),
  ('00000000-0000-0000-0000-000000000005', 'trainer', 'Personal Trainer', 'Access to assigned members and training features', 60, true)
ON CONFLICT (id) DO NOTHING;

-- Insert predefined permissions
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

-- Assign permissions to roles
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