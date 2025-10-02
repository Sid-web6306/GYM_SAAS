'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

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
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_member_attendance', {
        p_gym_id: gymId,
        p_search: filters?.search ?? undefined,
        p_from: filters?.from ?? undefined,
        p_to: filters?.to ?? undefined,
        p_limit: filters?.limit ?? 50,
        p_offset: filters?.offset ?? 0,
      })
      if (error) throw error
      return (data || []) as AttendanceRow[]
    }
  })
}

export function useStaffAttendance(gymId: string | null, filters?: AttendanceFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['attendance', 'staff', gymId, filters],
    enabled: (options?.enabled ?? true) && !!gymId,
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!gymId) return []
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_staff_attendance', {
        p_gym_id: gymId,
        p_search: filters?.search ?? undefined,
        p_from: filters?.from ?? undefined,
        p_to: filters?.to ?? undefined,
        p_limit: filters?.limit ?? 50,
        p_offset: filters?.offset ?? 0,
      })
      if (error) throw error
      return (data || []) as AttendanceRow[]
    }
  })
}

export function formatDurationFromSeconds(totalSeconds: number | null | undefined) {
  if (!totalSeconds || totalSeconds <= 0) return '—'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}


