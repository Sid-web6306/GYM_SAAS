import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toastActions } from '@/stores/toast-store'
import { useEffect } from 'react'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

// NOTE: All data operations now go through API routes. The Supabase client is only used for real-time subscriptions.

// Types
export interface Gym {
  id: string
  name: string | null
  created_at: string
  updated_at?: string
}

// NOTE: MemberData interface removed - no longer needed after API refactor

export interface GymStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  pendingMembers: number
  newMembersThisMonth: number
  newMembersThisWeek: number
  monthlyRevenue: number
  projectedMonthlyRevenue: number
  todayCheckins: number
  averageDailyCheckins: number
  memberRetentionRate: number
  averageMembershipLength: number
}

export interface GymAnalytics {
  memberGrowthData: Array<{
    month: string
    members: number
    newMembers: number
  }>
  revenueData: Array<{
    month: string
    revenue: number
    target: number
  }>
  checkinData: Array<{
    day: string
    checkins: number
    weekday: string
  }>
}

// Helper function to identify authentication and logout-related errors
function isAuthenticationError(error: unknown): boolean {
  if (!error) return false
  
  // Handle empty error objects which often occur during logout
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as { message?: string; code?: string | number }
    const errorMessage = errorObj.message || ''
    const errorCode = String(errorObj.code || '')
    
    // Check if it's an empty object (common during logout)
    const isEmptyObject = Object.keys(errorObj).length === 0
    if (isEmptyObject) {
      return true // Treat empty error objects as auth-related during logout
    }
    
    // Common auth error patterns
    const authErrorPatterns = [
      'session_expired',
      'jwt expired',
      'refresh_token_not_found',
      'invalid_jwt',
      'JWT expired',
      'No API key found',
      'Invalid API key',
      'User not found',
      'permission denied',
      'Invalid user',
      'User session not found'
    ]
    
    return authErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorCode.includes(pattern)
    ) || errorCode === '401'
  }
  
  return false
}

// Query Keys
export const gymKeys = {
  all: ['gym'] as const,
  lists: () => [...gymKeys.all, 'list'] as const,
  list: (filters: string) => [...gymKeys.lists(), { filters }] as const,
  details: () => [...gymKeys.all, 'detail'] as const,
  detail: (id: string) => [...gymKeys.details(), id] as const,
  stats: (id: string) => [...gymKeys.all, 'stats', id] as const,
  analytics: (id: string) => [...gymKeys.all, 'analytics', id] as const,
}

// Enhanced Gym Data Hook with real-time updates and auth handling
export function useGymData(gymId: string | null) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()

  const query = useQuery({
    queryKey: gymKeys.detail(gymId || ''),
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Fetch gym via API
      const response = await fetch(`/api/gyms?id=${gymId}`)
      const result = await response.json()
      
      if (!response.ok) {
        // Enhanced error handling for logout scenarios
        if (response.status === 401) {
          logger.info('Gym fetch: Authentication/logout error - this is expected during logout')
          throw new Error('Unauthorized')
        }
        if (response.status === 404) {
          logger.info('Gym not found:', { gymId })
          throw new Error('Gym not found')
        }
        
        logger.error('Gym fetch error:', {
          error: result.error,
          gymId,
          isAuthenticated,
          hasUser: !!user
        })
        throw new Error(result.error || 'Failed to fetch gym')
      }
      
      return result.gym as Gym
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      // Don't retry on not found errors
      if (error instanceof Error && error.message === 'Gym not found') {
        return false
      }
      return failureCount < 3
    },
  })

  // Enhanced authentication state monitoring and cleanup
  useEffect(() => {
    // Cancel any ongoing queries when user logs out or loses authentication
    if (!isAuthenticated || !user) {
      logger.info('Gym data: Detected logout, cancelling gym queries')
      queryClient.cancelQueries({ queryKey: gymKeys.all })
      return
    }
  }, [isAuthenticated, user, queryClient])

  // Set up real-time subscription for gym updates (without toasts - mutations handle them)
  useEffect(() => {
    // Only create subscription if user is authenticated and has a gym
    if (!gymId || !isAuthenticated || !user) return

    const supabase = createClient()
    
    const subscription = supabase
      .channel(`gym-${gymId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gyms',
          filter: `id=eq.${gymId}`,
        },
        (payload) => {
          logger.info('Gym real-time update:', payload)
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Update cache with real-time data (no toast - mutations handle user feedback)
            queryClient.setQueryData(gymKeys.detail(gymId), payload.new as Gym)
          } else if (payload.eventType === 'DELETE') {
            // Handle gym deletion (no toast - this would be a rare admin action)
            queryClient.removeQueries({ queryKey: gymKeys.detail(gymId) })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [gymId, isAuthenticated, user, queryClient])

  return query
}

// Enhanced Gym Stats Hook with comprehensive metrics and auth handling
export function useGymStats(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: gymKeys.stats(gymId || ''),
    queryFn: async (): Promise<GymStats> => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Fetch stats via API
      const response = await fetch(`/api/gyms/stats?gym_id=${gymId}`)
      const result = await response.json()
      
      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          logger.info('Stats fetch: Authentication error during logout - this is expected')
          throw new Error('Unauthorized')
        }
        
        logger.error('Stats fetch error:', { error: result.error, gymId })
        throw new Error(result.error || 'Failed to fetch stats')
      }

      return result.stats as GymStats
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes for live stats
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })
}

// NOTE: Old useGymAnalytics function removed - now using use-gym-analytics.ts with API routes

// Enhanced Update Gym with optimistic updates
export function useUpdateGym() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ gymId, updates }: { gymId: string; updates: Partial<Gym> }) => {
      // Update gym via API
      const response = await fetch(`/api/gyms?id=${gymId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Gym update error:', { error: result.error, gymId })
        throw new Error(result.error || 'Failed to update gym')
      }
      
      return result.gym as Gym
    },
    onMutate: async ({ gymId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: gymKeys.detail(gymId) })
      
      // Snapshot previous value
      const previousGym = queryClient.getQueryData(gymKeys.detail(gymId))
      
      // Optimistically update
      queryClient.setQueryData(gymKeys.detail(gymId), (old: Gym | undefined) => 
        old ? { ...old, ...updates } : undefined
      )
      
      return { previousGym }
    },
    onError: (err, { gymId }, context) => {
      // Revert optimistic update on error
      if (context?.previousGym) {
        queryClient.setQueryData(gymKeys.detail(gymId), context.previousGym)
      }
      
      toastActions.error('Update Failed', 'Failed to update gym information. Please try again.')
    },
    onSuccess: (updatedGym) => {
      // Update cache with server response
      queryClient.setQueryData(gymKeys.detail(updatedGym.id), updatedGym)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: gymKeys.stats(updatedGym.id) })
      queryClient.invalidateQueries({ queryKey: gymKeys.analytics(updatedGym.id) })
      
      toastActions.success('Gym Updated', 'Gym information has been updated successfully.')
    },
  })
}

// Create Gym Hook (for admin functionality)
export function useCreateGym() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to create a gym')
      }
      
      // Create gym via API
      const response = await fetch('/api/gyms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Gym creation error:', { error: result.error })
        throw new Error(result.error || 'Failed to create gym')
      }
      
      return result.gym as Gym
    },
    onSuccess: (newGym) => {
      // Add to cache
      queryClient.setQueryData(gymKeys.detail(newGym.id), newGym)
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: gymKeys.lists() })
      
      toastActions.success('Gym Created', 'New gym has been created successfully.')
    },
    onError: () => {
      toastActions.error('Creation Failed', 'Failed to create gym. Please try again.')
    },
  })
}

// Utility function to refresh all gym data
export function useRefreshGymData() {
  const queryClient = useQueryClient()
  
  return (gymId: string) => {
    queryClient.invalidateQueries({ queryKey: gymKeys.detail(gymId) })
    queryClient.invalidateQueries({ queryKey: gymKeys.stats(gymId) })
    queryClient.invalidateQueries({ queryKey: gymKeys.analytics(gymId) })
  }
}

// NOTE: Helper functions removed - analytics now handled by API routes

// Prefetch function for server-side usage
// Hook to get gym owner information using API
export function useGymOwner(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['gym', 'owner', gymId],
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Fetch owner via API
      const response = await fetch(`/api/gyms/owner?gym_id=${gymId}`)
      const result = await response.json()
      
      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          logger.info('Gym owner fetch: Authentication error during logout - this is expected')
          throw new Error('Unauthorized')
        }
        
        logger.error('Gym owner fetch error:', { error: result.error, gymId })
        throw new Error(result.error || 'Failed to fetch owner info')
      }
      
      return result.owner || null
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes - owner info changes rarely
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })
}

export async function prefetchGymData(queryClient: QueryClient, gymId: string) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: gymKeys.detail(gymId),
      queryFn: async () => {
        const response = await fetch(`/api/gyms?id=${gymId}`)
        const result = await response.json()
        
        if (!response.ok) throw new Error(result.error || 'Failed to fetch gym')
        return result.gym
      },
      staleTime: 10 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: gymKeys.stats(gymId),
      queryFn: async () => {
        const response = await fetch(`/api/gyms/stats?gym_id=${gymId}`)
        const result = await response.json()
        
        if (!response.ok) throw new Error(result.error || 'Failed to fetch stats')
        return result.stats
      },
      staleTime: 5 * 60 * 1000,
    }),
  ])
} 