'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toastActions } from '@/stores/toast-store'
import { logger } from '@/lib/logger'

// Types
export type StaffCurrentStatus = {
  is_checked_in: boolean
  session_id: string | null
  check_in_at: string | null
  total_seconds: number | null
}

export type StaffCheckinRequest = {
  method?: string
  notes?: string
}

export type StaffCheckoutRequest = {
  checkout_at?: string
}

// Query keys
const staffPortalKeys = {
  status: () => ['staff', 'status'] as const,
  attendance: (filters: Record<string, unknown>) => ['staff', 'attendance', filters] as const,
}

// Hook to get staff's current check-in status
export function useStaffStatus() {
  return useQuery({
    queryKey: staffPortalKeys.status(),
    queryFn: async (): Promise<StaffCurrentStatus> => {
      const response = await fetch('/api/staff/status')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff status')
      }
      
      return data.status
    },
    refetchInterval: false,
    staleTime: 2 * 60 * 1000, // 2 minutes (status changes more frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    retry: 1,
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false // Don't refetch on component mount if data is fresh
  })
}

// Hook for staff check-in
export function useStaffCheckin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: StaffCheckinRequest) => {
      const response = await fetch('/api/staff/checkin', {
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
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: staffPortalKeys.status() })
      
      toastActions.success('Checked In', 'You have successfully checked in!')
      logger.info('Staff checked in successfully', { sessionId: data.session?.id })
    },
    onError: (error) => {
      logger.error('Staff check-in failed:', { error })
      toastActions.error('Check-in Failed', error.message)
    }
  })
}

// Hook for staff check-out
export function useStaffCheckout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: StaffCheckoutRequest = {}) => {
      const response = await fetch('/api/staff/checkout', {
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
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: staffPortalKeys.status() })
      
      toastActions.success('Checked Out', 'You have successfully checked out!')
      logger.info('Staff checked out successfully', { sessionId: data.session?.id })
    },
    onError: (error) => {
      logger.error('Staff check-out failed:', { error })
      toastActions.error('Check-out Failed', error.message)
    }
  })
}
