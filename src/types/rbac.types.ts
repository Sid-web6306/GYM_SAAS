// RBAC Types for Centric Fit Application

export type GymRole = 'owner' | 'manager' | 'staff' | 'trainer' | 'member';

export type Permission = 
  // Member Management
  | 'members.create'
  | 'members.read'
  | 'members.update'
  | 'members.delete'
  // Analytics & Reports
  | 'analytics.read'
  | 'analytics.export'
  // Gym Settings
  | 'gym.create'
  | 'gym.read'
  | 'gym.update'
  // Staff Management
  | 'staff.create'
  | 'staff.read'
  | 'staff.update'
  | 'staff.delete'
  // Financial
  | 'billing.read'
  | 'billing.update'
  // Member Activities
  | 'activities.create'
  | 'activities.read'
  | 'activities.update'
  | 'activities.delete'
  // Personal Data
  | 'profile.read'
  | 'profile.update';

export interface Role {
  id: string;
  name: GymRole;
  display_name: string;
  description: string | null;
  level: number;
  is_system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface PermissionDefinition {
  id: string;
  name: Permission;
  display_name: string;
  description: string | null;
  resource: string;
  action: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
  // Joined data
  role?: Role;
  permission?: PermissionDefinition;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  gym_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  role?: Role;
  gym?: {
    id: string;
    name: string;
  };
  assigned_by_user?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

export interface UserPermissions {
  gym_id: string;
  role: GymRole;
  role_level: number;
  permissions: Permission[];
  custom_permissions: Record<string, boolean>;
}

export interface RBACContext {
  user_id: string;
  gym_id: string;
  role: GymRole;
  role_level: number;
  permissions: Permission[];
  can: (permission: Permission) => boolean;
  hasRole: (role: GymRole | GymRole[]) => boolean;
  hasMinimumRole: (role: GymRole) => boolean;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  isTrainer: boolean;
  isMember: boolean;
}

// Extended Profile type with RBAC fields
export interface ProfileWithRBAC {
  id: string;
  full_name: string | null;
  gym_id: string | null;
  created_at: string;
  updated_at: string;
  email: string;
  email_verified?: boolean | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  // RBAC fields
  default_role: GymRole;
  custom_permissions: Record<string, boolean>;
  is_gym_owner: boolean;
  last_role_sync: string;
  // Computed fields
  current_role?: GymRole;
  role_level?: number;
  effective_permissions?: Permission[];
}

// Role level constants
export const ROLE_LEVELS: Record<GymRole, number> = {
  owner: 100,
  manager: 75,
  trainer: 60,
  staff: 50,
  member: 25,
} as const;

// Role hierarchy for easy comparison
export const ROLE_HIERARCHY: GymRole[] = [
  'member',
  'staff',
  'trainer',
  'manager',
  'owner',
] as const;

// Permission groups for UI organization
export const PERMISSION_GROUPS = {
  'Member Management': [
    'members.create',
    'members.read',
    'members.update',
    'members.delete',
  ],
  'Analytics & Reports': [
    'analytics.read',
    'analytics.export',
  ],
  'Gym Settings': [
    'gym.create',
    'gym.read',
    'gym.update',
  ],
  'Staff Management': [
    'staff.create',
    'staff.read',
    'staff.update',
    'staff.delete',
  ],
  'Financial': [
    'billing.read',
    'billing.update',
  ],
  'Activities': [
    'activities.create',
    'activities.read',
    'activities.update',
    'activities.delete',
  ],
  'Personal': [
    'profile.read',
    'profile.update',
  ],
} as const;

// Default permissions for each role
export const DEFAULT_ROLE_PERMISSIONS: Record<GymRole, Permission[]> = {
  owner: [
    'members.create', 'members.read', 'members.update', 'members.delete',
    'analytics.read', 'analytics.export',
    'gym.read', 'gym.update',
    'staff.create', 'staff.read', 'staff.update', 'staff.delete',
    'billing.read', 'billing.update',
    'activities.create', 'activities.read', 'activities.update', 'activities.delete',
    'profile.read', 'profile.update',
  ],
  manager: [
    'members.create', 'members.read', 'members.update', 'members.delete',
    'analytics.read', 'analytics.export',
    'gym.read',
    'staff.read',
    'activities.create', 'activities.read', 'activities.update', 'activities.delete',
    'profile.read', 'profile.update',
  ],
  trainer: [
    'members.read', 'members.update',
    'gym.read',
    'activities.create', 'activities.read', 'activities.update',
    'profile.read', 'profile.update',
  ],
  staff: [
    'members.create', 'members.read', 'members.update',
    'gym.read',
    'activities.create', 'activities.read', 'activities.update',
    'profile.read', 'profile.update',
  ],
  member: [
    'profile.read', 'profile.update',
    'activities.read',
  ],
} as const;

// Utility types
export type RoleAssignmentRequest = {
  user_id?: string;
  user_email?: string;
  role: GymRole;
  gym_id: string;
  expires_at?: string;
  notify_user?: boolean;
};

export type PermissionCheckRequest = {
  user_id: string;
  gym_id: string;
  permission: Permission;
};

export type RoleCheckRequest = {
  user_id: string;
  gym_id: string;
  role: GymRole | GymRole[];
};

// API Response types
export type RBACResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  permissions?: Permission[];
  role?: GymRole;
};

export type UserRoleResponse = RBACResponse<{
  user_role: UserRole;
  permissions: Permission[];
}>;

export type PermissionCheckResponse = RBACResponse<{
  has_permission: boolean;
  user_role: GymRole;
  user_level: number;
}>;

// Form types for role management
export type RoleAssignmentForm = {
  user_email: string;
  role: GymRole;
  expires_at?: string;
  notify_user?: boolean;
};

export type RoleUpdateForm = {
  role: GymRole;
  custom_permissions?: Record<Permission, boolean>;
  expires_at?: string;
};

// Query types for API endpoints
export type GetUserRolesQuery = {
  gym_id: string;
  include_inactive?: boolean;
};

export type GetRolePermissionsQuery = {
  role: GymRole;
};

export type SearchUsersQuery = {
  gym_id: string;
  query?: string;
  role?: GymRole;
  limit?: number;
  offset?: number;
};