'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
}

export function useMemberAttendance(gymId: string | null, filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', 'members', gymId, filters],
    enabled: !!gymId,
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!gymId) return []
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_member_attendance', {
        p_gym_id: gymId,
        p_search: filters?.search ?? null,
        p_from: filters?.from ?? null,
        p_to: filters?.to ?? null,
        p_limit: filters?.limit ?? 50,
        p_offset: filters?.offset ?? 0,
      })
      if (error) throw error
      return (data || []) as AttendanceRow[]
    }
  })
}

export function useStaffAttendance(gymId: string | null, filters?: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', 'staff', gymId, filters],
    enabled: !!gymId,
    queryFn: async (): Promise<AttendanceRow[]> => {
      if (!gymId) return []
      const supabase = createClient()
      const { data, error } = await supabase.rpc('get_staff_attendance', {
        p_gym_id: gymId,
        p_search: filters?.search ?? null,
        p_from: filters?.from ?? null,
        p_to: filters?.to ?? null,
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

export function useStartAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { subjectType: 'member' | 'staff'; memberId?: string; staffUserId?: string; method?: string; notes?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('start_attendance_session', {
        p_subject_type: args.subjectType,
        p_member_id: args.memberId ?? null,
        p_staff_user_id: args.staffUserId ?? null,
        p_method: args.method ?? null,
        p_notes: args.notes ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}

export function useEndAttendance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { sessionId: string; checkoutAt?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('end_attendance_session', {
        p_session_id: args.sessionId,
        p_checkout_at: args.checkoutAt ?? null,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}


