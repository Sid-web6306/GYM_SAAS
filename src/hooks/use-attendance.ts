'use client'

import { useQuery } from '@tanstack/react-query'

// NOTE: All data operations now go through API routes.

export type AttendanceFilters = {
  search?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export type AttendanceRow = {
  session_id: string
  member_id?: string
  staff_user_id?: string
  name: string
  role: string
  check_in_at: string
  check_out_at: string | null
  total_seconds: number | null | undefined
  notes?: string | null
}

export function useMemberAttendance(gymId: string | null, filters?: AttendanceFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'members', gymId, filters],
    enabled: (options?.enabled ?? true) && !!gymId,
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!gymId) return []
      
      // Build query params for API call
      const params = new URLSearchParams({ 
        gym_id: gymId, 
        type: 'members',
        limit: (filters?.limit ?? 50).toString(),
        offset: (filters?.offset ?? 0).toString()
      })
      
      if (filters?.search) params.set('search', filters.search)
      if (filters?.from) params.set('from', filters.from)
      if (filters?.to) params.set('to', filters.to)
      
      const response = await fetch(`/api/attendance?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance data')
      }
      
      return (result.attendance || []) as AttendanceRow[]
    }
  })
}

export function useStaffAttendance(gymId: string | null, filters?: AttendanceFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'staff', gymId, filters],
    enabled: (options?.enabled ?? true) && !!gymId,
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!gymId) return []
      
      // Build query params for API call
      const params = new URLSearchParams({ 
        gym_id: gymId, 
        type: 'staff',
        limit: (filters?.limit ?? 50).toString(),
        offset: (filters?.offset ?? 0).toString()
      })
      
      if (filters?.search) params.set('search', filters.search)
      if (filters?.from) params.set('from', filters.from)
      if (filters?.to) params.set('to', filters.to)
      
      const response = await fetch(`/api/attendance?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch attendance data')
      }
      
      return (result.attendance || []) as AttendanceRow[]
    }
  })
}

export function formatDurationFromSeconds(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return '—'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}


