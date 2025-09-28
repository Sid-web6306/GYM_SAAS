'use client'

// React import removed - not needed
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { toastActions } from '@/stores/toast-store'
import { useOfflineQueue } from './use-offline-queue'

// Types for member portal APIs
export interface MemberProfile {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  status: string | null | undefined
  join_date: string | null
  gym_id: string
  user_id: string | null
  created_at: string
}

export interface MemberAttendanceRecord {
  session_id: string
  check_in_at: string
  check_out_at: string | null
  total_seconds: number
  method: string | null
  notes: string | null
}

export interface MemberCurrentStatus {
  is_checked_in: boolean
  session_id: string | null
  check_in_at: string | null
  total_seconds: number | null
}

export interface CheckinRequest {
  method?: string
  notes?: string
}

export interface CheckoutRequest {
  checkout_at?: string
}

// Query keys for React Query
export const memberPortalKeys = {
  all: ['member-portal'] as const,
  profile: () => [...memberPortalKeys.all, 'profile'] as const,
  status: () => [...memberPortalKeys.all, 'status'] as const,
  attendance: (filters: { from?: string; to?: string; limit?: number; offset?: number }) => 
    [...memberPortalKeys.all, 'attendance', filters] as const,
  // Stable query key for stats that doesn't change
  stats: () => [...memberPortalKeys.all, 'stats'] as const,
} as const

// Hook to get member's own profile
export function useMemberProfile() {
  return useQuery({
    queryKey: memberPortalKeys.profile(),
    queryFn: async (): Promise<MemberProfile> => {
      const response = await fetch('/api/members/me')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch member profile')
      }
      
      return data.member
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (increased from 5 minutes)
    gcTime: 15 * 60 * 1000, // 15 minutes garbage collection
    retry: 1,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false // Don't refetch on component mount if data is fresh
  })
}

// Hook to get member's current check-in status
export function useMemberStatus() {
  return useQuery({
    queryKey: memberPortalKeys.status(),
    queryFn: async (): Promise<MemberCurrentStatus> => {
      const response = await fetch('/api/members/status')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch member status')
      }
      
      return data.status
    },
    refetchInterval: false,
    staleTime: 2 * 60 * 1000, // 2 minutes (status changes more frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}

// Hook to get member's attendance history
export function useMemberAttendance(filters: {
  from?: string
  to?: string
  limit?: number
  offset?: number
} = {}) {
  const { from, to, limit = 50, offset = 0 } = filters
  
  return useQuery({
    queryKey: memberPortalKeys.attendance(filters),
    queryFn: async (): Promise<{
      attendance: MemberAttendanceRecord[]
      pagination: { limit: number; offset: number; has_more: boolean }
    }> => {
      logger.info('⚠️ useMemberAttendance API call triggered - UNSTABLE QUERY KEY', { filters })
      
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      params.set('limit', limit.toString())
      params.set('offset', offset.toString())
      
      const response = await fetch(`/api/members/attendance?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance history')
      }
      
      logger.debug('useMemberAttendance API call completed', { 
        attendanceCount: data.attendance?.length || 0,
        filters 
      })
      
      return {
        attendance: data.attendance,
        pagination: data.pagination
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (attendance data is stable)
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    retry: 1,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false // Don't refetch on component mount if data is fresh
  })
}

// Hook for member check-in with offline support
export function useMemberCheckin() {
  const queryClient = useQueryClient()
  const { isOnline, queueItem } = useOfflineQueue()
  
  return useMutation({
    mutationFn: async (data: CheckinRequest) => {
      // If offline, queue the action
      if (!isOnline) {
        const queuedItem = queueItem({
          type: 'checkin',
          method: data.method,
          notes: data.notes
        })
        return { queued: true, queuedItem }
      }

      // If online, make the API call
      const response = await fetch('/api/members/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check in')
      }
      
      return result
    },
    onSuccess: (data) => {
      if (data.queued) {
        // Don't invalidate queries for queued items
        return
      }

      // Invalidate related queries for immediate checkins
      queryClient.invalidateQueries({ queryKey: memberPortalKeys.status() })
      queryClient.invalidateQueries({ queryKey: memberPortalKeys.attendance({}) })
      
      toastActions.success('Checked In', 'You have successfully checked in!')
      logger.info('Member checked in successfully', { sessionId: data.session?.id })
    },
    onError: (error) => {
      logger.error('Member check-in failed:', {error})
      toastActions.error('Check-in Failed', error.message)
    }
  })
}

// Hook for member check-out with offline support
export function useMemberCheckout() {
  const queryClient = useQueryClient()
  const { isOnline, queueItem } = useOfflineQueue()
  
  return useMutation({
    mutationFn: async (data: CheckoutRequest = {}) => {
      // If offline, queue the action
      if (!isOnline) {
        const queuedItem = queueItem({
          type: 'checkout',
          checkout_at: data.checkout_at
        })
        return { queued: true, queuedItem }
      }

      // If online, make the API call
      const response = await fetch('/api/members/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check out')
      }
      
      return result
    },
    onSuccess: (data) => {
      if (data.queued) {
        // Don't invalidate queries for queued items
        return
      }

      // Invalidate related queries for immediate checkouts
      queryClient.invalidateQueries({ queryKey: memberPortalKeys.status() })
      queryClient.invalidateQueries({ queryKey: memberPortalKeys.attendance({}) })
      
      toastActions.success('Checked Out', 'You have successfully checked out!')
      logger.info('Member checked out successfully', { sessionId: data.session?.id })
    },
    onError: (error) => {
      logger.error('Member check-out failed:', {error})
      toastActions.error('Check-out Failed', error.message)
    }
  })
}

// Hook to get member stats (today's time, week visits, etc.)
// Optimized to use single API call instead of multiple calls
export function useMemberStats() {
  const memberProfile = useMemberProfile()
  
  // Use a completely stable query that doesn't change on every render
  const { data: weekAttendance, isLoading: attendanceLoading, error: attendanceError } = useQuery({
    queryKey: ['member-portal-stats-global'], // Completely stable key
    queryFn: async () => {
      logger.info('🚀 useMemberStats API call triggered - STABLE QUERY KEY')
      
      // Calculate a stable week range
      const now = new Date()
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0)
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      const params = new URLSearchParams()
      params.set('from', weekStart.toISOString())
      params.set('to', weekEnd.toISOString())
      params.set('limit', '100')
      params.set('offset', '0')
      
      const response = await fetch(`/api/members/attendance?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch attendance history')
      }
      
      logger.debug('useMemberStats API call completed', { 
        attendanceCount: data.attendance?.length || 0
      })
      
      return data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (increased from 10)
    gcTime: 60 * 60 * 1000, // 60 minutes (increased from 30)
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    // Add query deduplication
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    // Prevent duplicate queries
    enabled: true,
    networkMode: 'online'
  })
  
  // Calculate stats from single dataset
  const stats = {
    weeklyVisits: weekAttendance?.attendance?.filter((a: MemberAttendanceRecord) => a.check_out_at).length || 0,
    todayTotalTime: 0,
    recentSessions: weekAttendance?.attendance?.slice(0, 5) || []
  }
  
  // Calculate today's total time from week data
  if (weekAttendance?.attendance) {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
    
    stats.todayTotalTime = weekAttendance.attendance
      .filter((session: MemberAttendanceRecord) => {
        const sessionDate = new Date(session.check_in_at)
        return sessionDate >= todayStart && sessionDate < todayEnd
      })
      .reduce((total: number, session: MemberAttendanceRecord) => {
        return total + (session.check_out_at ? session.total_seconds : 0)
      }, 0)
  }
  
  return {
    isLoading: memberProfile.isLoading || attendanceLoading,
    error: memberProfile.error || attendanceError,
    stats
  }
}
