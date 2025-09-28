import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toastActions } from '@/stores/toast-store'
import { useEffect } from 'react'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

// Types
export interface Gym {
  id: string
  name: string | null
  created_at: string
  updated_at?: string
}

interface MemberData {
  created_at: string
  status: string | null
  join_date: string | null
}

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
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gyms')
        .select('*')
        .eq('id', gymId)
        .single()
      
      if (error) {
        // Enhanced error handling for logout scenarios
        if (isAuthenticationError(error)) {
          logger.info('Gym fetch: Authentication/logout error - this is expected during logout')
          throw error
        }
        
        // Log detailed error info for debugging (only for non-auth errors)
        logger.error('Gym fetch error:', {
          error,
          errorType: typeof error,
          errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
          gymId,
          isAuthenticated,
          hasUser: !!user
        })
        throw error
      }
      
      return data as Gym
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      // Don't retry on not found errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
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
      
      const supabase = createClient()
      
      // Fetch members data
      const { data: members, error } = await supabase
        .from('members')
        .select('created_at, status, join_date')
        .eq('gym_id', gymId)

      if (error) {
        // Handle authentication errors gracefully
        if (isAuthenticationError(error)) {
          logger.info('Stats fetch: Authentication error during logout - this is expected')
          throw error
        }
        
        logger.error('Members fetch error for stats:', {error})
        throw error
      }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
      
      // Calculate comprehensive stats
      const totalMembers = members.length
      const activeMembers = members.filter(m => m.status === 'active').length
      const inactiveMembers = members.filter(m => m.status === 'inactive').length
      const pendingMembers = members.filter(m => m.status === 'pending').length
      
      const newMembersThisMonth = members.filter(m => 
        new Date(m.created_at) >= startOfMonth
      ).length
      
      const newMembersThisWeek = members.filter(m => 
        new Date(m.created_at) >= startOfWeek
      ).length

      // Revenue calculations (you can adjust pricing logic)
      const monthlyRevenue = activeMembers * 50 // $50 per active member
      const projectedMonthlyRevenue = totalMembers * 50 // Potential if all were active
      
      // Mock check-in data (replace with actual data when available)
      const todayCheckins = Math.floor(Math.random() * (activeMembers * 0.5)) + Math.floor(activeMembers * 0.1)
      const averageDailyCheckins = Math.floor(activeMembers * 0.3)
      
      // Calculate retention rate (simplified - you may want more sophisticated calculation)
      const memberRetentionRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0
      
      // Average membership length (simplified calculation)
      const averageMembershipLength = members.reduce((acc, member) => {
        const joinDate = new Date(member.join_date || member.created_at)
        const monthsDiff = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        return acc + Math.max(monthsDiff, 0)
      }, 0) / Math.max(totalMembers, 1)

      const stats: GymStats = {
        totalMembers,
        activeMembers,
        inactiveMembers,
        pendingMembers,
        newMembersThisMonth,
        newMembersThisWeek,
        monthlyRevenue,
        projectedMonthlyRevenue,
        todayCheckins,
        averageDailyCheckins,
        memberRetentionRate: Math.round(memberRetentionRate * 100) / 100,
        averageMembershipLength: Math.round(averageMembershipLength * 100) / 100,
      }

      return stats
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

// Gym Analytics Hook for charts and detailed insights with auth handling
export function useGymAnalytics(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: gymKeys.analytics(gymId || ''),
    queryFn: async (): Promise<GymAnalytics> => {
      if (!gymId) throw new Error('Gym ID is required')
      
      const supabase = createClient()
      
      // Fetch members data for analytics
      const { data: members, error } = await supabase
        .from('members')
        .select('created_at, status, join_date')
        .eq('gym_id', gymId)

      if (error) {
        // Handle authentication errors gracefully
        if (isAuthenticationError(error)) {
          logger.info('Analytics fetch: Authentication error during logout - this is expected')
          throw error
        }
        
        logger.error('Members fetch error for analytics:', {error})
        throw error
      }

      // Generate member growth data (last 12 months)
      const memberGrowthData = generateMemberGrowthData(members)
      
      // Generate revenue data (last 6 months)
      const revenueData = generateRevenueData(members)
      
      // Generate check-in trends (last 7 days)
      const checkinData = generateCheckinData(members)

      return {
        memberGrowthData,
        revenueData,
        checkinData,
      }
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes - analytics can be slightly stale
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Enhanced Update Gym with optimistic updates
export function useUpdateGym() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ gymId, updates }: { gymId: string; updates: Partial<Gym> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gyms')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', gymId)
        .select()
        .single()
      
      if (error) {
        logger.error('Gym update error:', {error})
        throw error
      }
      
      return data as Gym
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
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('gyms')
        .insert({
          name,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        logger.error('Gym creation error:', {error})
        throw error
      }
      
      return data as Gym
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

// Helper functions for generating mock analytics data
function generateMemberGrowthData(members: MemberData[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const currentMonth = new Date().getMonth()
  const data = []
  
  let totalMembers = 0
  
  for (let i = 0; i < 12; i++) {
    const monthIndex = (currentMonth - 11 + i + 12) % 12
    const monthName = months[monthIndex]
    
    // Calculate members added in this month
    const monthStart = new Date()
    monthStart.setMonth(monthIndex, 1)
    monthStart.setHours(0, 0, 0, 0)
    
    const monthEnd = new Date()
    monthEnd.setMonth(monthIndex + 1, 0)
    monthEnd.setHours(23, 59, 59, 999)
    
    const newMembers = members.filter(m => {
      const createdAt = new Date(m.created_at)
      return createdAt >= monthStart && createdAt <= monthEnd
    }).length
    
    totalMembers += newMembers
    
    data.push({
      month: monthName,
      members: totalMembers,
      newMembers
    })
  }
  
  return data
}

function generateRevenueData(members: MemberData[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const data = []
  
  for (let i = 0; i < 6; i++) {
    const monthName = months[i]
    
    // Calculate active members for revenue (simplified)
    const activeMembers = members.filter(m => m.status === 'active').length
    const baseRevenue = activeMembers * 50
    const variation = (Math.random() - 0.5) * 0.3
    const revenue = Math.round(baseRevenue * (1 + variation))
    const target = Math.round(baseRevenue * 1.1)
    
    data.push({
      month: monthName,
      revenue,
      target
    })
  }
  
  return data
}

function generateCheckinData(members: MemberData[]) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const data = []
  const today = new Date()
  const activeMembers = members.filter(m => m.status === 'active').length
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    
    const dayName = days[date.getDay()]
    const dayNum = date.getDate()
    
    // Generate realistic check-in patterns
    let baseCheckins = Math.floor(activeMembers * 0.3)
    if (dayName === 'Sat' || dayName === 'Sun') {
      baseCheckins = Math.floor(activeMembers * 0.2) // Lower weekend activity
    } else if (dayName === 'Mon' || dayName === 'Fri') {
      baseCheckins = Math.floor(activeMembers * 0.25) // Moderate
    } else {
      baseCheckins = Math.floor(activeMembers * 0.35) // Higher midweek
    }
    
    const variation = Math.floor(Math.random() * 10) - 5
    const checkins = Math.max(Math.floor(activeMembers * 0.1), baseCheckins + variation)
    
    data.push({
      day: `${dayName} ${dayNum}`,
      checkins,
      weekday: dayName
    })
  }
  
  return data
}

// Prefetch function for server-side usage
// Hook to get gym owner information using secure RPC function
export function useGymOwner(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: ['gym', 'owner', gymId],
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      const supabase = createClient()
      const { data, error } = await supabase
        .rpc('get_gym_owner_info', { gym_uuid: gymId })
      
      if (error) {
        // Handle authentication errors gracefully
        if (isAuthenticationError(error)) {
          logger.info('Gym owner fetch: Authentication error during logout - this is expected')
          throw error
        }
        
        // Handle access denied (user not in gym) - return null
        if (error.message?.includes('Access denied')) {
          logger.info('Gym owner fetch: Access denied - user not member of gym')
          return null
        }
        
        logger.error('Gym owner fetch error:', {error})
        throw error
      }
      
      // RPC returns array with different field names, map to expected format
      if (data && data.length > 0) {
        const owner = data[0]
        return {
          id: owner.owner_id,
          full_name: owner.owner_full_name,
          email: owner.owner_email
        }
      }
      return null
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 15 * 60 * 1000, // 15 minutes - owner info changes rarely
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      // Don't retry on access denied errors
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('Access denied')) {
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
        const supabase = createClient()
        const { data, error } = await supabase
          .from('gyms')
          .select('*')
          .eq('id', gymId)
          .single()
        
        if (error) throw error
        return data
      },
      staleTime: 10 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: gymKeys.stats(gymId),
      queryFn: async () => {
        const supabase = createClient()
        const { data: members, error } = await supabase
          .from('members')
          .select('created_at, status, join_date')
          .eq('gym_id', gymId)

        if (error) throw error
        
        // Calculate basic stats for prefetch
        const totalMembers = members.length
        const activeMembers = members.filter(m => m.status === 'active').length
        
        return {
          totalMembers,
          activeMembers,
          inactiveMembers: members.filter(m => m.status === 'inactive').length,
          pendingMembers: members.filter(m => m.status === 'pending').length,
          newMembersThisMonth: 0, // Calculate as needed
          newMembersThisWeek: 0,
          monthlyRevenue: activeMembers * 50,
          projectedMonthlyRevenue: totalMembers * 50,
          todayCheckins: Math.floor(activeMembers * 0.3),
          averageDailyCheckins: Math.floor(activeMembers * 0.3),
          memberRetentionRate: (activeMembers / Math.max(totalMembers, 1)) * 100,
          averageMembershipLength: 6, // Default value
        }
      },
      staleTime: 5 * 60 * 1000,
    }),
  ])
} 