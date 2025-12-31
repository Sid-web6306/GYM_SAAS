import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { 
  InvitationWithDetails, 
  CreateInvitationRequest, 
  UseInvitationsResult,
  InvitationFilters,
  InvitationSummary
} from '@/types/invite.types'
import type { Database } from '@/types/supabase'
import { useMemo, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { toastActions } from '@/stores/toast-store'

// NOTE: Most operations go through API routes. The Supabase client is only used for real-time subscriptions.

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
      
      const response = await fetch(`/api/invites?gym_id=${targetGymId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invitations')
      }
      
      return { success: true, invitations: data.invitations || [] }
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

  // Enhanced error handling function
  const handleInvitationError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    logger.error(`Invitation ${context} failed`, {
      error: errorMessage,
      context,
      targetGymId,
      timestamp: new Date().toISOString()
    })

    // Handle specific error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      toastActions.error('Rate Limited', 'Please wait before sending more invitations')
      return
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      toastActions.error('Permission Denied', 'You don\'t have permission to perform this action')
      return
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      toastActions.error('Connection Error', 'Please check your internet connection and try again')
      return
    }

    // Generic error
    toastActions.error('Operation Failed', errorMessage)
  }, [targetGymId])

  // Create invitation mutation with enhanced error handling
  const createMutation = useMutation({
    mutationFn: async (data: CreateInvitationRequest) => {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          role: data.role,
          gym_id: data.gym_id || targetGymId,
          expires_in_hours: data.expires_in_hours || 72,
          message: data.message,
          notify_user: data.notify_user !== false
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invitation')
      }

      return { success: true, invitation: result.invitation }
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
        queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })
      }
    },
    onError: (error) => handleInvitationError(error, 'creation'),
    retry: (failureCount, error) => {
      // Retry network errors but not permission/validation errors
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes('permission') || errorMessage.includes('validation') || errorMessage.includes('rate limit')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  })

  // Revoke invitation mutation with enhanced error handling
  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/invites?invite_id=${invitationId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke invitation')
      }

      return result
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
        queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })
      }
    },
    onError: (error) => handleInvitationError(error, 'revocation'),
    retry: (failureCount, error) => {
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes('permission') || errorMessage.includes('not found')) {
        return false
      }
      return failureCount < 2
    }
  })

  // Resend invitation mutation with enhanced error handling
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch('/api/invites/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: invitationId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend invitation')
      }

      return result
    },
    onSuccess: () => {
      if (targetGymId) {
        queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
      }
    },
    onError: (error) => handleInvitationError(error, 'resend'),
    retry: (failureCount, error) => {
      const errorMessage = error.message.toLowerCase()
      if (errorMessage.includes('permission') || errorMessage.includes('rate limit') || errorMessage.includes('accepted')) {
        return false
      }
      return failureCount < 2
    }
  })

  // Real-time updates via Supabase subscriptions
  useEffect(() => {
    if (!targetGymId) return

    const supabase = createClient()
    
    // Subscribe to invitation changes for the current gym
    const channel = supabase
      .channel(`invitation-changes-${targetGymId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gym_invitations',
          filter: `gym_id=eq.${targetGymId}`
        },
        (payload) => {
          // Type-safe payload handling using proper Supabase types
          const newRecord = payload.new as Database['public']['Tables']['gym_invitations']['Row'] | null
          const oldRecord = payload.old as Database['public']['Tables']['gym_invitations']['Row'] | null
          
          logger.info('Real-time invitation update received', {
            event: payload.eventType,
            invitationId: newRecord?.id || oldRecord?.id,
            gymId: targetGymId
          })

          // Invalidate and refetch invitation queries
          queryClient.invalidateQueries({ queryKey: invitationKeys.list(targetGymId) })
          queryClient.invalidateQueries({ queryKey: invitationKeys.summary(targetGymId) })

          // Show toast notification for certain events
          if (payload.eventType === 'INSERT' && newRecord?.email) {
            toastActions.info('New Invitation', `Invitation sent to ${newRecord.email}`)
          } else if (payload.eventType === 'UPDATE' && newRecord?.status && newRecord?.email) {
            const status = newRecord.status
            const email = newRecord.email
            
            if (status === 'accepted') {
              toastActions.success('Invitation Accepted', `${email} has joined the team!`)
            } else if (status === 'expired') {
              toastActions.warning('Invitation Expired', `Invitation to ${email} has expired`)
            } else if (status === 'revoked') {
              toastActions.info('Invitation Revoked', `Invitation to ${email} was revoked`)
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to invitation updates', { gymId: targetGymId })
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Error subscribing to invitation updates', { gymId: targetGymId })
        }
      })

    // Cleanup subscription on unmount
    return () => {
      logger.info('Unsubscribing from invitation updates', { gymId: targetGymId })
      supabase.removeChannel(channel)
    }
  }, [targetGymId, queryClient])

  return {
    invitations,
    isLoading,
    error: error?.message || null,
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

      // Fetch all invitations via API and calculate summary
      const response = await fetch(`/api/invites?gym_id=${targetGymId}&status=all`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch invitations')
      }

      const invitations = result.invitations || []
      const summary = invitations.reduce((acc: InvitationSummary, invitation: { status: string }) => {
        acc.total++
        const status = invitation.status as keyof Omit<InvitationSummary, 'total'>
        if (status in acc) {
          acc[status]++
        }
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
      const response = await fetch(`/api/invites/${invitationId}`)
      const result = await response.json()

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(result.error || 'Failed to fetch invitation')
      }

      return result.invitation as InvitationWithDetails
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
      queryClient.invalidateQueries({ queryKey: ['auth-session'] })
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
        invitationIds.map(id => 
          fetch(`/api/invites?invite_id=${id}`, { method: 'DELETE' })
            .then(async (res) => {
              const data = await res.json()
              if (!res.ok) {
                throw new Error(data.error || 'Failed to revoke invitation')
              }
              if (!data.success) {
                throw new Error(data.error || 'Failed to revoke invitation')
              }
              return data
            })
        )
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
        invitationIds.map(id =>
          fetch('/api/invites/resend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invite_id: id })
          })
            .then(async (res) => {
              const data = await res.json()
              if (!res.ok) {
                throw new Error(data.error || 'Failed to resend invitation')
              }
              if (!data.success) {
                throw new Error(data.error || 'Failed to resend invitation')
              }
              return data
            })
        )
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
      // Call cleanup API endpoint
      const response = await fetch('/api/invites/cleanup', {
        method: 'POST'
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to cleanup invitations')
      }

      return { success: true }
    },
    onSuccess: () => {
      // Invalidate all invitation queries
      queryClient.invalidateQueries({ queryKey: invitationKeys.all })
    },
  })
}
