'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

// NOTE: All data operations now go through API routes instead of direct DB access.

export interface StaffMember {
  id: string
  full_name: string | null
  email: string | null
  default_role: string | null
  created_at: string
}

export interface StaffFilters {
  search?: string
  role?: string
  limit?: number
  offset?: number
}

export function useStaffData(gymId: string, filters?: StaffFilters & { enabled?: boolean }) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['staff', 'list', gymId, filters],
    enabled: !!gymId && isAuthenticated && !!user && (filters?.enabled !== false),
    queryFn: async (): Promise<{ staff: StaffMember[]; total: number }> => {
      if (!gymId) return { staff: [], total: 0 }
      
      // Build query params for API call
      const params = new URLSearchParams({ gym_id: gymId })
      
      if (filters?.search) {
        params.set('search', filters.search)
      }
      if (filters?.role) {
        params.set('role', filters.role)
      }
      if (filters?.limit) {
        params.set('limit', filters.limit.toString())
        params.set('offset', (filters.offset || 0).toString())
      }

      const response = await fetch(`/api/staff?${params}`)
      const result = await response.json()

      if (!response.ok) {
        logger.error('Staff query failed', { gymId, error: result.error })
        throw new Error(result.error || 'Failed to fetch staff')
      }

      return {
        staff: result.staff || [],
        total: result.pagination?.total || 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook for getting current user as staff if they have a role in the gym
export function useCurrentUserAsStaff(gymId: string) {
  const { user, profile } = useAuth()
  
  return useQuery({
    queryKey: ['staff', 'current-user', gymId, user?.id],
    enabled: !!gymId && !!user && !!profile?.gym_id,
    queryFn: async (): Promise<StaffMember | null> => {
      if (!gymId || !user || !profile) return null
      
      // If user's gym_id matches the target gym, they're staff
      if (profile.gym_id === gymId) {
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          default_role: profile.default_role ?? null,
          created_at: profile.created_at ?? new Date().toISOString(),
        }
      }
      
      return null
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get available roles in the gym
export function useGymRoles(gymId: string) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['gym', 'roles', gymId],
    enabled: !!gymId && isAuthenticated && !!user,
    queryFn: async () => {
      if (!gymId) return []
      
      // Use the RBAC API to get all roles
      const response = await fetch(`/api/rbac?action=all-roles`)
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Roles query failed', { gymId, error: result.error })
        throw new Error(result.error || 'Failed to fetch roles')
      }
      
      // Sort by level
      const roles = result.roles || []
      return roles.sort((a: { level: number }, b: { level: number }) => a.level - b.level)
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}
