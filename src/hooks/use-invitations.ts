import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from './use-auth'
import { createInvitation, revokeInvitation, resendInvitation, getGymInvitations } from '@/actions/invite.actions'
import type { 
  InvitationWithDetails, 
  CreateInvitationRequest, 
  UseInvitationsResult,
  InvitationFilters,
  InvitationSummary
} from '@/types/invite.types'
import { useMemo } from 'react'

// ========== QUERY KEYS ==========

export const invitationKeys = {
  all: ['invitations'] as const,
  lists: () => [...invitationKeys.all, 'list'] as const,
  list: (gymId: string, filters?: InvitationFilters) => 
    [...invitationKeys.lists(), gymId, filters] as const,
  details: () => [...invitationKeys.all, 'detail'] as const,
  detail: (id: string) => [...invitationKeys.details(), id] as const,
  summary: (gymId: string) => [...invitationKeys.all, 'summary', gymId] as const,
} as const

// ========== MAIN INVITATIONS HOOK ==========

export const useInvitations = (
  gymId?: string,
  filters?: InvitationFilters
): UseInvitationsResult => {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const targetGymId = gymId || profile?.gym_id

  // Fetch invitations
  const {
    data: invitationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: invitationKeys.list(targetGymId || '', filters),
    queryFn: async () => {
      if (!targetGymId) return { success: false, invitations: [] }
      return await getGymInvitations(targetGymId)
    },
    enabled: !!targetGymId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const invitations = useMemo(() => {
    const data = (invitationsData?.invitations || []) as InvitationWithDetails[]
    
    if (!filters) return data

    return data.filter(invitation => {
      // Status filter
      if (filters.status && filters.status !== 'all' && invitation.status !== filters.status) {
        return false
      }

      // Role filter
      if (filters.role && filters.role !== 'all' && invitation.role !== filters.role) {
        return false
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return invitation.email.toLowerCase().includes(searchLower) ||
               invitation.role.toLowerCase().includes(searchLower)
      }

      // Date filters (guard against missing created_at)
      if (filters.date_from && invitation.created_at) {
        const inviteDate = new Date(invitation.created_at)
        const fromDate = new Date(filters.date_from)
        if (inviteDate < fromDate) return false
      }

      if (filters.date_to && invitation.created_at) {
        const inviteDate = new Date(invitation.created_at)
        const toDate = new Date(filters.date_to)
        if (inviteDate > toDate) return false
      }

      return true
    })
  }, [invitationsData?.invitations, filters])

  // Create invitation mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateInvitationRequest) => {
      const formData = new FormData()
      formData.append('email', data.email)
      formData.append('role', data.role)
      if (data.gym_id) formData.append('gym_id', data.gym_id)
      formData.append('expires_in_hours', String(data.expires_in_hours || 72))
      if (data.message) formData.append('message', data.message)
      formData.append('notify_user', String(data.notify_user !== false))

      return await createInvitation(formData)
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
        queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })
      }
    },
  })

  // Revoke invitation mutation
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const formData = new FormData()
      formData.append('invite_id', invitationId)
      return await revokeInvitation(formData)
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
        queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })
      }
    },
  })

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const formData = new FormData()
      formData.append('invite_id', invitationId)
      return await resendInvitation(formData)
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
      }
    },
  })

  return {
    invitations,
    isLoading,
    error: error?.message || invitationsData?.error || null,
    refetch,
    createInvitation: createMutation.mutateAsync,
    revokeInvitation: revokeMutation.mutateAsync,
    resendInvitation: resendMutation.mutateAsync,
  }
}

// ========== INVITATION SUMMARY HOOK ==========

export const useInvitationSummary = (gymId?: string) => {
  const { profile } = useAuth()
  const targetGymId = gymId || profile?.gym_id

  return useQuery({
    queryKey: invitationKeys.summary(targetGymId || ''),
    queryFn: async (): Promise<InvitationSummary> => {
      if (!targetGymId) {
        return { total: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 }
      }

      const supabase = createClient()
      
      // Get summary counts
      const { data, error } = await supabase
        .from('gym_invitations')
        .select('status')
        .eq('gym_id', targetGymId)

      if (error) throw error

      const summary = data.reduce((acc, invitation) => {
        acc.total++
        acc[invitation.status as keyof InvitationSummary]++
        return acc
      }, { total: 0, pending: 0, accepted: 0, expired: 0, revoked: 0 })

      return summary
    },
    enabled: !!targetGymId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ========== SINGLE INVITATION HOOK ==========

export const useInvitation = (invitationId: string) => {
  return useQuery({
    queryKey: invitationKeys.detail(invitationId),
    queryFn: async (): Promise<InvitationWithDetails | null> => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('gym_invitations')
        .select(`
          id,
          gym_id,
          email,
          role,
          status,
          token,
          expires_at,
          accepted_at,
          metadata,
          created_at,
          updated_at,
          accepted_by:profiles!gym_invitations_accepted_by_fkey(
            id,
            full_name,
            email
          ),
          gym:gyms(
            id,
            name
          )
        `)
        .eq('id', invitationId)
        .single()

      if (error) throw error
      return data as InvitationWithDetails
    },
    enabled: !!invitationId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// ========== INVITATION VERIFICATION HOOK ==========

export const useInviteVerification = (token: string) => {
  const queryClient = useQueryClient()

  const {
    data: verificationData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['invite-verification', token],
    queryFn: async () => {
      if (!token) return null

      const response = await fetch(`/api/invites/verify?invite=${encodeURIComponent(token)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify invitation')
      }

      return data
    },
    enabled: !!token,
    retry: false, // Don't retry verification requests
    staleTime: 0, // Always fetch fresh data for verification
  })

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/invites/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      return data
    },
    onSuccess: () => {
      // Invalidate auth queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['rbac'] })
    },
  })

  return {
    invitation: verificationData?.invitation || null,
    userStatus: verificationData?.user_status || null,
    isValid: verificationData?.valid || false,
    isLoading,
    error: error?.message || null,
    acceptInvitation: acceptMutation.mutateAsync,
  }
}

// ========== BULK OPERATIONS HOOKS ==========

export const useBulkInviteOperations = (gymId?: string) => {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const targetGymId = gymId || profile?.gym_id

  const bulkRevokeMutation = useMutation({
    mutationFn: async (invitationIds: string[]) => {
      const results = await Promise.allSettled(
        invitationIds.map(id => {
          const formData = new FormData()
          formData.append('invite_id', id)
          return revokeInvitation(formData)
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.length - successful

      return { successful, failed, total: results.length }
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
        queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })
      }
    },
  })

  const bulkResendMutation = useMutation({
    mutationFn: async (invitationIds: string[]) => {
      const results = await Promise.allSettled(
        invitationIds.map(id => {
          const formData = new FormData()
          formData.append('invite_id', id)
          return resendInvitation(formData)
        })
      )

      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.length - successful

      return { successful, failed, total: results.length }
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
      }
    },
  })

  return {
    bulkRevoke: bulkRevokeMutation.mutateAsync,
    bulkResend: bulkResendMutation.mutateAsync,
    isLoading: bulkRevokeMutation.isPending || bulkResendMutation.isPending,
  }
}

// ========== CLEANUP HOOK ==========

export const useInvitationCleanup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      
      // Mark expired invitations
      const { error } = await supabase.rpc('mark_expired_invitations')
      if (error) throw error

      return { success: true }
    },
    onSuccess: () => {
      // Invalidate all invitation queries
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}
