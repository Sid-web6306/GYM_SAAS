'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'

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
      
      const supabase = createClient()
      
      // Build query for profiles who have roles in this gym (staff members)
      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          default_role,
          created_at,
          user_roles!inner(
            gym_id,
            is_active,
            role_id,
            roles(name, display_name)
          )
        `)
        .eq('user_roles.gym_id', gymId)
        .eq('user_roles.is_active', true)
        .order('full_name', { ascending: true })

      // Apply search filter
      if (filters?.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
        )
      }

      // Apply role filter
      if (filters?.role) {
        query = query.eq('user_roles.roles.name', filters.role)
      }

      // Apply pagination
      const limit = filters?.limit || 50
      const offset = filters?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) {
        logger.error('Staff query failed', { gymId, error: error.message })
        throw error
      }

      // Transform data to flatten the role information
      const staff: StaffMember[] = (data || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        default_role: profile.default_role || null,
        created_at: profile.created_at,
      }))

      return {
        staff,
        total: count || 0
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
      
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          roles(
            id,
            name,
            display_name,
            description,
            level
          )
        `)
        .eq('gym_id', gymId)
        .eq('is_active', true)
      
      if (error) {
        logger.error('Roles query failed', { gymId, error: error.message })
        throw error
      }
      
      // Extract unique roles
      const uniqueRoles = new Map()
      data?.forEach(item => {
        if (item.roles) {
          uniqueRoles.set(item.roles.id, item.roles)
        }
      })
      
      return Array.from(uniqueRoles.values()).sort((a, b) => a.level - b.level)
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}
