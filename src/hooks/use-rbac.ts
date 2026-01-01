'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

// NOTE: All data operations now go through API routes.
import type { 
  GymRole, 
  Permission, 
  UserPermissions, 
  RBACContext,
  UserRole,
  Role,
  PermissionDefinition,
  RoleAssignmentRequest
} from '@/types/rbac.types'
import { ROLE_LEVELS } from '@/types/rbac.types'

// ========== QUERY KEYS ==========

export const rbacKeys = {
  all: ['rbac'] as const,
  userRole: (userId: string, gymId: string) => [...rbacKeys.all, 'user-role', userId, gymId] as const,
  userPermissions: (userId: string, gymId: string) => [...rbacKeys.all, 'permissions', userId, gymId] as const,
  gymRoles: (gymId: string) => [...rbacKeys.all, 'gym-roles', gymId] as const,
  roles: () => [...rbacKeys.all, 'roles'] as const,
  permissions: () => [...rbacKeys.all, 'permissions'] as const,
} as const

// ========== RBAC CONTEXT HOOK ==========

export const useRBAC = (): RBACContext | null => {
  const { user, profile, isAuthenticated } = useAuth()

  // Get user's role and permissions for their current gym
  const { data: userPermissions } = useQuery({
    queryKey: rbacKeys.userPermissions(user?.id || '', profile?.gym_id || ''),
    queryFn: async (): Promise<UserPermissions | null> => {
      if (!user?.id || !profile?.gym_id) return null

      // Get user permissions via API
      const response = await fetch(`/api/rbac?action=user-permissions&user_id=${user.id}&gym_id=${profile.gym_id}`)
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Error fetching user permissions:', { error: result.error })
        return null
      }
      
      return result.permissions as UserPermissions
    },
    enabled: isAuthenticated && !!user?.id && !!profile?.gym_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const rbacContext = useMemo((): RBACContext | null => {
    if (!user?.id || !profile?.gym_id || !userPermissions) return null

    const role = userPermissions.role
    const permissions = userPermissions.permissions || []
    const roleLevel = userPermissions.role_level

    return {
      user_id: user.id,
      gym_id: profile.gym_id,
      role,
      role_level: roleLevel,
      permissions,
      can: (permission: Permission) => permissions.includes(permission),
      hasRole: (roles: GymRole | GymRole[]) => {
        const rolesToCheck = Array.isArray(roles) ? roles : [roles]
        return rolesToCheck.includes(role)
      },
      hasMinimumRole: (minimumRole: GymRole) => {
        const minimumLevel = ROLE_LEVELS[minimumRole]
        return roleLevel >= minimumLevel
      },
      isOwner: role === 'owner',
      isManager: role === 'manager',
      isStaff: role === 'staff',
      isTrainer: role === 'trainer',
      isMember: role === 'member',
    }
  }, [user?.id, profile?.gym_id, userPermissions])

  return rbacContext
}

// ========== INDIVIDUAL RBAC HOOKS ==========

export const useRole = (): GymRole | null => {
  const rbac = useRBAC()
  return rbac?.role || null
}

export const usePermissions = (): Permission[] => {
  const rbac = useRBAC()
  return rbac?.permissions || []
}

export const useCanAccess = (permission: Permission): boolean => {
  const rbac = useRBAC()
  return rbac?.can(permission) || false
}

export const useHasRole = (roles: GymRole | GymRole[]): boolean => {
  const rbac = useRBAC()
  return rbac?.hasRole(roles) || false
}

export const useHasMinimumRole = (minimumRole: GymRole): boolean => {
  const rbac = useRBAC()
  return rbac?.hasMinimumRole(minimumRole) || false
}

export const useIsOwner = (): boolean => {
  const rbac = useRBAC()
  return rbac?.isOwner || false
}

export const useIsManager = (): boolean => {
  const rbac = useRBAC()
  return rbac?.isManager || false
}

export const useIsStaff = (): boolean => {
  const rbac = useRBAC()
  return rbac?.isStaff || false
}

// ========== ROLE MANAGEMENT HOOKS ==========

export const useGymRoles = (gymId?: string) => {
  const { profile } = useAuth()
  const targetGymId = gymId || profile?.gym_id

  return useQuery({
    queryKey: rbacKeys.gymRoles(targetGymId || ''),
    queryFn: async (): Promise<UserRole[]> => {
      if (!targetGymId) return []

      // Get gym roles via API
      const response = await fetch(`/api/rbac?action=gym-roles&gym_id=${targetGymId}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch gym roles')
      }
      
      return (result.roles || []) as UserRole[]
    },
    enabled: !!targetGymId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useAllRoles = () => {
  return useQuery({
    queryKey: rbacKeys.roles(),
    queryFn: async (): Promise<Role[]> => {
      // Get all roles via API
      const response = await fetch('/api/rbac?action=all-roles')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch roles')
      }
      
      return (result.roles || []) as Role[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (roles don't change often)
  })
}

export const useAllPermissions = () => {
  return useQuery({
    queryKey: rbacKeys.permissions(),
    queryFn: async (): Promise<PermissionDefinition[]> => {
      // Get all permissions via API
      const response = await fetch('/api/rbac?action=all-permissions')
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch permissions')
      }
      
      return (result.permissions || []) as PermissionDefinition[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (permissions don't change often)
  })
}

// ========== ROLE ASSIGNMENT MUTATIONS ==========

export const useAssignRole = () => {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (request: RoleAssignmentRequest) => {
      // Ensure gym_id is provided
      const finalRequest = {
        ...request,
        gym_id: request.gym_id || profile?.gym_id || ''
      }

      if (!finalRequest.gym_id) {
        throw new Error('No gym ID available')
      }

      // Use API endpoint for role assignment
      const response = await fetch('/api/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalRequest)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign role')
      }

      return data
    },
    onSuccess: (_, variables) => {
      const gymId = variables.gym_id || profile?.gym_id || ''
      const userId = variables.user_id || ''
      
      // Invalidate relevant queries
      if (gymId) {
        queryClient.invalidateQueries({ 
          queryKey: rbacKeys.gymRoles(gymId) 
        })
      }
      
      if (userId && gymId) {
        queryClient.invalidateQueries({ 
          queryKey: rbacKeys.userPermissions(userId, gymId) 
        })
      }
    },
  })
}

export const useRemoveRole = () => {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async ({ user_id, gym_id }: { user_id: string; gym_id?: string }) => {
      const targetGymId = gym_id || profile?.gym_id || ''
      
      if (!targetGymId) {
        throw new Error('No gym ID available')
      }

      // Use API endpoint for user removal
      const response = await fetch(`/api/rbac?user_id=${user_id}&gym_id=${targetGymId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove user')
      }

      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: rbacKeys.gymRoles(variables.gym_id || profile?.gym_id || '') 
      })
      queryClient.invalidateQueries({ 
        queryKey: rbacKeys.userPermissions(variables.user_id, variables.gym_id || profile?.gym_id || '') 
      })
    },
  })
}

// ========== PERMISSION CHECKING UTILITIES ==========

export const usePermissionCheck = () => {
  const rbac = useRBAC()

  return useCallback((permission: Permission): boolean => {
    return rbac?.can(permission) || false
  }, [rbac])
}

export const useRoleCheck = () => {
  const rbac = useRBAC()

  return useCallback((roles: GymRole | GymRole[]): boolean => {
    return rbac?.hasRole(roles) || false
  }, [rbac])
}

export const useMinimumRoleCheck = () => {
  const rbac = useRBAC()

  return useCallback((minimumRole: GymRole): boolean => {
    return rbac?.hasMinimumRole(minimumRole) || false
  }, [rbac])
}

// ========== COMPONENT HELPER HOOKS ==========

export const useRBACGuard = (
  permission?: Permission,
  role?: GymRole | GymRole[],
  minimumRole?: GymRole
) => {
  const rbac = useRBAC()

  const canAccess = useMemo(() => {
    if (!rbac) return false

    if (permission && !rbac.can(permission)) return false
    if (role && !rbac.hasRole(role)) return false
    if (minimumRole && !rbac.hasMinimumRole(minimumRole)) return false

    return true
  }, [rbac, permission, role, minimumRole])

  return {
    canAccess,
    role: rbac?.role || null,
    permissions: rbac?.permissions || [],
    roleLevel: rbac?.role_level || 0,
  }
}

// ========== ERROR HANDLING ==========

export class RBACError extends Error {
  constructor(
    message: string,
    public code: string = 'RBAC_ERROR',
    public context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RBACError'
  }
}

// ========== ROLE HIERARCHY UTILITIES ==========

export const useRoleHierarchy = () => {
  return useMemo(() => ({
    isHigherRole: (roleA: GymRole, roleB: GymRole): boolean => {
      return ROLE_LEVELS[roleA] > ROLE_LEVELS[roleB]
    },
    canAssignRole: (assignerRole: GymRole, targetRole: GymRole): boolean => {
      return ROLE_LEVELS[assignerRole] > ROLE_LEVELS[targetRole]
    },
    canManageUser: (managerRole: GymRole, targetRole: GymRole): boolean => {
      return ROLE_LEVELS[managerRole] >= ROLE_LEVELS[targetRole] && managerRole !== 'member'
    },
  }), [])
}