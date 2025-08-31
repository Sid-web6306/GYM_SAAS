'use client'

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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
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
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time status
    staleTime: 15 * 1000, // 15 seconds
    retry: 1
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
      
      return {
        attendance: data.attendance,
        pagination: data.pagination
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1
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
export function useMemberStats() {
  const memberProfile = useMemberProfile()
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 7)
  
  const { data: weekAttendance } = useMemberAttendance({
    from: weekStart.toISOString(),
    to: today.toISOString(),
    limit: 100
  })
  
  const { data: todayAttendance } = useMemberAttendance({
    from: new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(),
    to: today.toISOString(),
    limit: 10
  })
  
  return {
    isLoading: memberProfile.isLoading,
    error: memberProfile.error,
    stats: {
      weeklyVisits: weekAttendance?.attendance?.filter(a => a.check_out_at).length || 0,
      todayTotalTime: todayAttendance?.attendance?.reduce((total, session) => {
        return total + (session.check_out_at ? session.total_seconds : 0)
      }, 0) || 0,
      recentSessions: weekAttendance?.attendance?.slice(0, 5) || []
    }
  }
}
