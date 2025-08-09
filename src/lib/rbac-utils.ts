import type { GymRole, Permission } from '@/types/rbac.types'
import { ROLE_LEVELS as ROLE_LEVEL_VALUES } from '@/types/rbac.types'

// ========== ROLE HIERARCHY UTILITIES ==========

/**
 * Check if one role is higher than another
 */
export function isHigherRole(roleA: GymRole, roleB: GymRole): boolean {
  return ROLE_LEVEL_VALUES[roleA] > ROLE_LEVEL_VALUES[roleB]
}

/**
 * Check if one role is higher than or equal to another
 */
export function isHigherOrEqualRole(roleA: GymRole, roleB: GymRole): boolean {
  return ROLE_LEVEL_VALUES[roleA] >= ROLE_LEVEL_VALUES[roleB]
}

/**
 * Get the highest role from an array of roles
 */
export function getHighestRole(roles: GymRole[]): GymRole | null {
  if (roles.length === 0) return null
  
  return roles.reduce((highest, current) => 
    isHigherRole(current, highest) ? current : highest
  )
}

/**
 * Check if a user can assign a specific role
 * (Users can only assign roles lower than their own)
 */
export function canAssignRole(assignerRole: GymRole, targetRole: GymRole): boolean {
  return isHigherRole(assignerRole, targetRole)
}

/**
 * Check if a user can manage another user based on roles
 * (Users can manage users with lower or equal roles, except members can't manage anyone)
 */
export function canManageUser(managerRole: GymRole, targetRole: GymRole): boolean {
  if (managerRole === 'member') return false
  return isHigherOrEqualRole(managerRole, targetRole)
}

/**
 * Get all roles that a user can assign (roles lower than their own)
 */
export function getAssignableRoles(userRole: GymRole): GymRole[] {
  const userLevel = ROLE_LEVEL_VALUES[userRole]
  
  return (Object.keys(ROLE_LEVEL_VALUES) as GymRole[]).filter(
    role => ROLE_LEVEL_VALUES[role] < userLevel
  )
}

/**
 * Get roles that are manageable by the user (lower or equal level, except for members)
 */
export function getManageableRoles(userRole: GymRole): GymRole[] {
  if (userRole === 'member') return []
  
  const userLevel = ROLE_LEVEL_VALUES[userRole]
  
  return (Object.keys(ROLE_LEVEL_VALUES) as GymRole[]).filter(
    role => ROLE_LEVEL_VALUES[role] <= userLevel
  )
}

// ========== PERMISSION UTILITIES ==========

/**
 * Check if a permission list contains a specific permission
 */
export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission)
}

/**
 * Check if a permission list contains any of the specified permissions
 */
export function hasAnyPermission(permissions: Permission[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.some(permission => permissions.includes(permission))
}

/**
 * Check if a permission list contains all of the specified permissions
 */
export function hasAllPermissions(permissions: Permission[], requiredPermissions: Permission[]): boolean {
  return requiredPermissions.every(permission => permissions.includes(permission))
}

/**
 * Get permissions by resource (e.g., all 'members' permissions)
 */
export function getPermissionsByResource(permissions: Permission[], resource: string): Permission[] {
  return permissions.filter(permission => permission.startsWith(`${resource}.`))
}

/**
 * Get permissions by action (e.g., all 'create' permissions)
 */
export function getPermissionsByAction(permissions: Permission[], action: string): Permission[] {
  return permissions.filter(permission => permission.endsWith(`.${action}`))
}

/**
 * Parse permission into resource and action
 */
export function parsePermission(permission: Permission): { resource: string; action: string } {
  const [resource, action] = permission.split('.')
  return { resource, action }
}

/**
 * Create a permission string from resource and action
 */
export function createPermission(resource: string, action: string): Permission {
  return `${resource}.${action}` as Permission
}

// ========== ROLE DISPLAY UTILITIES ==========

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: GymRole): string {
  const displayNames: Record<GymRole, string> = {
    owner: 'Gym Owner',
    manager: 'Manager',
    trainer: 'Personal Trainer',
    staff: 'Staff Member',
    member: 'Member'
  }
  
  return displayNames[role] || role
}

/**
 * Get role description
 */
export function getRoleDescription(role: GymRole): string {
  const descriptions: Record<GymRole, string> = {
    owner: 'Full access to all gym features and settings',
    manager: 'Manage members, staff, and day-to-day operations',
    trainer: 'Access to assigned members and training features',
    staff: 'Access to member management and basic features',
    member: 'Limited access to personal information and activities'
  }
  
  return descriptions[role] || ''
}

/**
 * Get role color for UI display
 */
export function getRoleColor(role: GymRole): string {
  const colors: Record<GymRole, string> = {
    owner: 'bg-purple-100 text-purple-800 border-purple-200',
    manager: 'bg-blue-100 text-blue-800 border-blue-200',
    trainer: 'bg-green-100 text-green-800 border-green-200',
    staff: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    member: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return colors[role] || colors.member
}

/**
 * Get role icon (returns emoji or icon class)
 */
export function getRoleIcon(role: GymRole): string {
  const icons: Record<GymRole, string> = {
    owner: '👑',
    manager: '👔',
    trainer: '💪',
    staff: '👷',
    member: '👤'
  }
  
  return icons[role] || icons.member
}

// ========== PERMISSION DISPLAY UTILITIES ==========

/**
 * Get display name for a permission
 */
export function getPermissionDisplayName(permission: Permission): string {
  const { resource, action } = parsePermission(permission)
  
  const resourceNames: Record<string, string> = {
    members: 'Members',
    analytics: 'Analytics',
    gym: 'Gym Settings',
    staff: 'Staff',
    billing: 'Billing',
    activities: 'Activities',
    profile: 'Profile'
  }
  
  const actionNames: Record<string, string> = {
    create: 'Create',
    read: 'View',
    update: 'Edit',
    delete: 'Delete',
    export: 'Export'
  }
  
  const resourceName = resourceNames[resource] || resource
  const actionName = actionNames[action] || action
  
  return `${actionName} ${resourceName}`
}

/**
 * Get permission description
 */
export function getPermissionDescription(permission: Permission): string {
  const descriptions: Record<Permission, string> = {
    'members.create': 'Add new members to the gym',
    'members.read': 'View member list and details',
    'members.update': 'Edit member information',
    'members.delete': 'Remove members from the gym',
    'analytics.read': 'Access gym analytics and reports',
    'analytics.export': 'Export analytics data and reports',
    'gym.read': 'View gym information and settings',
    'gym.update': 'Modify gym settings and information',
    'staff.create': 'Invite new staff members',
    'staff.read': 'View staff list and roles',
    'staff.update': 'Update staff roles and permissions',
    'staff.delete': 'Remove staff members',
    'billing.read': 'Access billing information',
    'billing.update': 'Update billing and subscription settings',
    'activities.create': 'Record member activities and check-ins',
    'activities.read': 'View member activities and check-ins',
    'activities.update': 'Modify activity records',
    'activities.delete': 'Remove activity records',
    'profile.read': 'View personal profile information',
    'profile.update': 'Update personal profile information'
  }
  
  return descriptions[permission] || ''
}

/**
 * Group permissions by resource for display
 */
export function groupPermissionsByResource(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce((groups, permission) => {
    const { resource } = parsePermission(permission)
    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(permission)
    return groups
  }, {} as Record<string, Permission[]>)
}

// ========== VALIDATION UTILITIES ==========

/**
 * Validate if a role is valid
 */
export function isValidRole(role: string): role is GymRole {
  return Object.keys(ROLE_LEVEL_VALUES).includes(role as GymRole)
}

/**
 * Validate if a permission is valid
 */
export function isValidPermission(permission: string): permission is Permission {
  const validPermissions: Permission[] = [
    'members.create', 'members.read', 'members.update', 'members.delete',
    'analytics.read', 'analytics.export',
    'gym.read', 'gym.update',
    'staff.create', 'staff.read', 'staff.update', 'staff.delete',
    'billing.read', 'billing.update',
    'activities.create', 'activities.read', 'activities.update', 'activities.delete',
    'profile.read', 'profile.update'
  ]
  
  return validPermissions.includes(permission as Permission)
}

/**
 * Sanitize role input
 */
export function sanitizeRole(role: string): GymRole | null {
  const cleanRole = role.toLowerCase().trim()
  return isValidRole(cleanRole) ? cleanRole : null
}

/**
 * Sanitize permission input
 */
export function sanitizePermission(permission: string): Permission | null {
  const cleanPermission = permission.toLowerCase().trim()
  return isValidPermission(cleanPermission) ? cleanPermission : null
}

// ========== RBAC CONTEXT UTILITIES ==========

/**
 * Create an RBAC context object for easier checks
 */
export function createRBACContext(
  role: GymRole,
  permissions: Permission[]
) {
  return {
    role,
    permissions,
    level: ROLE_LEVEL_VALUES[role],
    
    // Role checks
    isOwner: () => role === 'owner',
    isManager: () => role === 'manager',
    isTrainer: () => role === 'trainer',
    isStaff: () => role === 'staff',
    isMember: () => role === 'member',
    
    // Permission checks
    can: (permission: Permission) => hasPermission(permissions, permission),
    canAny: (perms: Permission[]) => hasAnyPermission(permissions, perms),
    canAll: (perms: Permission[]) => hasAllPermissions(permissions, perms),
    
    // Role level checks
    hasMinimumRole: (minRole: GymRole) => isHigherOrEqualRole(role, minRole),
    hasRole: (roles: GymRole | GymRole[]) => {
      const targetRoles = Array.isArray(roles) ? roles : [roles]
      return targetRoles.includes(role)
    },
    
    // Management checks
    canAssign: (targetRole: GymRole) => canAssignRole(role, targetRole),
    canManage: (targetRole: GymRole) => canManageUser(role, targetRole),
    
    // Display helpers
    displayName: getRoleDisplayName(role),
    description: getRoleDescription(role),
    color: getRoleColor(role),
    icon: getRoleIcon(role)
  }
}

// ========== ERROR HANDLING ==========

export class RBACError extends Error {
  constructor(
    message: string,
    public code: 'INSUFFICIENT_PERMISSION' | 'INVALID_ROLE' | 'INVALID_PERMISSION' | 'RBAC_ERROR' = 'RBAC_ERROR',
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RBACError'
  }
}

/**
 * Throw an RBAC error with context
 */
export function throwRBACError(
  message: string,
  code?: RBACError['code'],
  context?: Record<string, unknown>
): never {
  throw new RBACError(message, code, context)
}

/**
 * Handle RBAC errors gracefully
 */
export function handleRBACError(error: unknown): {
  message: string
  code: string
  isRBACError: boolean
} {
  if (error instanceof RBACError) {
    return {
      message: error.message,
      code: error.code,
      isRBACError: true
    }
  }
  
  return {
    message: error instanceof Error ? error.message : 'Unknown RBAC error',
    code: 'RBAC_ERROR',
    isRBACError: false
  }
}