/**
 * RBAC Service - Role-based access control utilities
 * Business logic for role hierarchy and permission checking
 */

import type { GymRole, Permission } from '@/types/rbac.types'
import { ROLE_LEVELS, ROLE_PERMISSIONS } from '@/lib/constants/rbac'

// ========== ROLE HIERARCHY UTILITIES ==========

/**
 * Check if one role is higher than another
 */
export function isHigherRole(roleA: GymRole, roleB: GymRole): boolean {
  return ROLE_LEVELS[roleA] > ROLE_LEVELS[roleB]
}

/**
 * Check if one role is higher than or equal to another
 */
export function isHigherOrEqualRole(roleA: GymRole, roleB: GymRole): boolean {
  return ROLE_LEVELS[roleA] >= ROLE_LEVELS[roleB]
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
  const allRoles: GymRole[] = ['member', 'trainer', 'staff', 'manager', 'owner']
  return allRoles.filter(role => canAssignRole(userRole, role))
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: GymRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: GymRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if a user has all required permissions
 */
export function hasAllPermissions(role: GymRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(role: GymRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Filter permissions by category
 */
export function getPermissionsByCategory(_category: string): Permission[] {
  const rolePermissions = Object.values(ROLE_PERMISSIONS).flat()
  // This would need the PERMISSION_METADATA from constants
  // For now, return all permissions for the role
  return rolePermissions
}

/**
 * Check if a role can access a specific resource/action
 */
export function canAccessResource(role: GymRole, resource: string, action: string): boolean {
  const permission = `${resource}.${action}` as Permission
  return hasPermission(role, permission)
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role: GymRole): number {
  return ROLE_LEVELS[role]
}

/**
 * Compare two roles and return the relationship
 */
export function compareRoles(roleA: GymRole, roleB: GymRole): 'higher' | 'lower' | 'equal' {
  const levelA = getRoleLevel(roleA)
  const levelB = getRoleLevel(roleB)
  
  if (levelA > levelB) return 'higher'
  if (levelA < levelB) return 'lower'
  return 'equal'
}
