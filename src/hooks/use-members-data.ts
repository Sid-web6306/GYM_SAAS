import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toastActions } from '@/stores/toast-store'
import { useEffect } from 'react'
import { useAuth } from './use-auth'
import { logger } from '@/lib/logger'

// NOTE: All data operations now go through API routes instead of direct DB access.
// The Supabase client is only used for real-time subscriptions.

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

// Types (re-export from member.types.ts for consistency)
export type { Member, MemberStatus } from '@/types/member.types'
import type { Member } from '@/types/member.types'

export interface MemberActivity {
  id: string
  member_id: string
  activity_type: string
  timestamp: string
  member?: Member
}

export interface CreateMemberData {
  first_name: string
  last_name: string
  email?: string | null
  phone_number?: string | null
  status?: string
  join_date?: string
}

export interface MemberFilters {
  search?: string
  status?: string | null
  sortBy?: 'name' | 'join_date' | 'status' | 'created_at'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface MembersResponse {
  members: Member[]
  totalCount: number
  hasMore: boolean
}

// Query Keys
export const membersKeys = {
  all: ['members'] as const,
  lists: () => [...membersKeys.all, 'list'] as const,
  list: (gymId: string, filters?: MemberFilters) => [...membersKeys.lists(), gymId, { filters }] as const,
  details: () => [...membersKeys.all, 'detail'] as const,
  detail: (id: string) => [...membersKeys.details(), id] as const,
  activity: (gymId: string) => [...membersKeys.all, 'activity', gymId] as const,
  stats: (gymId: string) => [...membersKeys.all, 'stats', gymId] as const,
}

// Enhanced Members List Hook with pagination, real-time updates, and auth handling
export function useMembers(gymId: string | null, filters?: MemberFilters) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()

  const query = useQuery({
    queryKey: membersKeys.list(gymId || '', filters),
    queryFn: async (): Promise<MembersResponse> => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Build query params for API call
      const params = new URLSearchParams({ gym_id: gymId })
      
      if (filters?.status && filters.status !== 'all') {
        params.set('status', filters.status)
      }
      if (filters?.search) {
        params.set('search', filters.search)
      }
      if (filters?.limit) {
        params.set('limit', filters.limit.toString())
        params.set('offset', (filters.offset || 0).toString())
      }

      const response = await fetch(`/api/members?${params}`)
      const result = await response.json()

      if (!response.ok) {
        // Enhanced error handling for logout scenarios
        if (response.status === 401) {
          logger.debug('Members fetch: Authentication/logout error - this is expected during logout')
          throw new Error('Unauthorized')
        }

        logger.error('Members fetch failed', {
          error: result.error,
          gymId,
          isAuthenticated,
          hasUser: !!user
        })
        throw new Error(result.error || 'Failed to fetch members')
      }

      return {
        members: result.members as Member[],
        totalCount: result.pagination?.total || 0,
        hasMore: result.pagination?.hasMore || false
      }
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: { members: [], totalCount: 0, hasMore: false },
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })

  // Enhanced authentication state monitoring and cleanup
  useEffect(() => {
    // Cancel any ongoing queries when user logs out or loses authentication
    if (!isAuthenticated || !user) {
      logger.debug('Members data: Detected logout, cancelling member queries')
      queryClient.cancelQueries({ queryKey: membersKeys.all })
      return
    }
  }, [isAuthenticated, user, queryClient])

  // Set up real-time subscription for members (without toasts - mutations handle them)
  useEffect(() => {
    // Only create subscription if user is authenticated and has a gym
    if (!gymId || !isAuthenticated || !user) return

    const supabase = createClient()
    
    const subscription = supabase
      .channel(`members-${gymId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `gym_id=eq.${gymId}`,
        },
        (payload) => {
          logger.debug('Members real-time update received', { eventType: payload.eventType, recordId: payload.new })
          
          // Only invalidate queries - no toasts (mutations handle user feedback)
          queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
          queryClient.invalidateQueries({ queryKey: membersKeys.stats(gymId) })
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            // Update specific member in cache if we have it
            const member = payload.new as Member
            queryClient.setQueryData(membersKeys.detail(member.id), member)
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const memberId = (payload.old as Member).id
            queryClient.removeQueries({ queryKey: membersKeys.detail(memberId) })
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

// Single Member Hook with real-time updates and auth handling
export function useMember(memberId: string | null) {
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()

  const query = useQuery({
    queryKey: membersKeys.detail(memberId || ''),
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required')
      
      const params = new URLSearchParams({ id: memberId })
      const response = await fetch(`/api/members?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          logger.debug('Member fetch: Authentication error during logout - this is expected')
          throw new Error('Unauthorized')
        }
        
        logger.error('Member fetch failed', { memberId, error: result.error })
        throw new Error(result.error || 'Failed to fetch member')
      }
      
      return result.member as Member
    },
    enabled: !!memberId && isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })

  // Real-time subscription for single member
  useEffect(() => {
    // Only create subscription if user is authenticated and has a member ID
    if (!memberId || !isAuthenticated || !user) return

    const supabase = createClient()
    
    const subscription = supabase
      .channel(`member-${memberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `id=eq.${memberId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new) {
            queryClient.setQueryData(membersKeys.detail(memberId), payload.new as Member)
          } else if (payload.eventType === 'DELETE') {
            queryClient.removeQueries({ queryKey: membersKeys.detail(memberId) })
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [memberId, isAuthenticated, user, queryClient])

  return query
}

// Recent Activity Hook with mock data and auth handling (replace with real implementation)
export function useRecentActivity(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: membersKeys.activity(gymId || ''),
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Get some recent members for mock activity via API
      const params = new URLSearchParams({ gym_id: gymId, limit: '10' })
      const response = await fetch(`/api/members?${params}`)
      const result = await response.json()
      
      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          logger.debug('Activity fetch: Authentication error during logout - this is expected')
          throw new Error('Unauthorized')
        }
        
        logger.error('Member activity fetch failed', { gymId, error: result.error })
        throw new Error(result.error || 'Failed to fetch activity')
      }
      
      const members = result.members || []
      
      // Generate mock activity data
      const mockActivity: MemberActivity[] = members.slice(0, 5).map((member: Member, index: number) => ({
        id: `activity-${member.id}-${index}`,
        member_id: member.id,
        activity_type: Math.random() > 0.5 ? 'check_in' : 'check_out',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        member: member as Member,
      }))
      
      return mockActivity
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Members Stats Hook with auth handling
export function useMembersStats(gymId: string | null) {
  const { isAuthenticated, user } = useAuth()
  
  return useQuery({
    queryKey: membersKeys.stats(gymId || ''),
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      const params = new URLSearchParams({ gym_id: gymId, summary: 'true' })
      const response = await fetch(`/api/members?${params}`)
      const result = await response.json()

      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          logger.debug('Members stats fetch: Authentication error during logout - this is expected')
          throw new Error('Unauthorized')
        }
        
        logger.error('Members stats fetch failed', { gymId, error: result.error })
        throw new Error(result.error || 'Failed to fetch stats')
      }

      return result.stats as {
        total: number
        active: number
        inactive: number
        pending: number
        newThisMonth: number
        newThisWeek: number
      }
    },
    enabled: !!gymId && isAuthenticated && !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (isAuthenticationError(error)) {
        return false
      }
      return failureCount < 3
    },
  })
}

// Enhanced Create Member with optimistic updates
export function useCreateMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ gymId, memberData }: { gymId: string; memberData: CreateMemberData }) => {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gym_id: gymId,
          first_name: memberData.first_name,
          last_name: memberData.last_name,
          email: memberData.email || null,
          phone_number: memberData.phone_number || null,
          status: memberData.status || 'active',
          join_date: memberData.join_date || new Date().toISOString(),
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Member creation failed', { error: result.error })
        throw new Error(result.error || 'Failed to create member')
      }
      
      return result.member as Member
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: membersKeys.lists() })
      
      // We could optimistically add the member to the list here,
      // but it's complex with pagination and filtering, so we'll just invalidate
    },
    onSuccess: (newMember) => {
      // Add to detail cache
      queryClient.setQueryData(membersKeys.detail(newMember.id), newMember)
      
      // Invalidate and refetch lists to include new member
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
      queryClient.invalidateQueries({ queryKey: membersKeys.stats(newMember.gym_id) })
      
      // Invalidate gym stats since member count changed
      queryClient.invalidateQueries({ queryKey: ['gym', 'stats', newMember.gym_id] })
      
      toastActions.success('Member Added', 'New member has been added successfully.')
    },
    onError: (error) => {
      logger.error('Member creation mutation failed', { error: error instanceof Error ? error.message : String(error) })
      toastActions.error('Creation Failed', 'Failed to add member. Please try again.')
    },
  })
}

// Enhanced Update Member with optimistic updates
export function useUpdateMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: Partial<Member> }) => {
      const params = new URLSearchParams({ id: memberId })
      const response = await fetch(`/api/members?${params}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        logger.error('Member update failed', { memberId, error: result.error })
        throw new Error(result.error || 'Failed to update member')
      }
      
      return result.member as Member
    },
    onMutate: async ({ memberId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: membersKeys.detail(memberId) })
      
      // Snapshot previous value
      const previousMember = queryClient.getQueryData(membersKeys.detail(memberId))
      
      // Optimistically update
      queryClient.setQueryData(membersKeys.detail(memberId), (old: Member | undefined) => 
        old ? { ...old, ...updates } : undefined
      )
      
      return { previousMember }
    },
    onError: (err, { memberId }, context) => {
      // Revert optimistic update on error
      if (context?.previousMember) {
        queryClient.setQueryData(membersKeys.detail(memberId), context.previousMember)
      }
      
      toastActions.error('Update Failed', 'Failed to update member. Please try again.')
    },
    onSuccess: (updatedMember) => {
      // Update caches
      queryClient.setQueryData(membersKeys.detail(updatedMember.id), updatedMember)
      
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
      
      // If status changed, invalidate stats
      queryClient.invalidateQueries({ queryKey: membersKeys.stats(updatedMember.gym_id) })
      queryClient.invalidateQueries({ queryKey: ['gym', 'stats', updatedMember.gym_id] })
      
      toastActions.success('Member Updated', 'Member information has been updated successfully.')
    },
  })
}

// Enhanced Delete Member
export function useDeleteMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (memberId: string) => {
      // First get the member to know the gym_id for cache invalidation
      const getParams = new URLSearchParams({ id: memberId })
      const getResponse = await fetch(`/api/members?${getParams}`)
      const getMemberResult = await getResponse.json()
      const gymId = getMemberResult.member?.gym_id
      
      // Delete the member
      const params = new URLSearchParams({ id: memberId })
      const response = await fetch(`/api/members?${params}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const result = await response.json()
        logger.error('Member deletion failed', { memberId, error: result.error })
        throw new Error(result.error || 'Failed to delete member')
      }
      
      return { memberId, gymId }
    },
    onMutate: async (memberId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: membersKeys.detail(memberId) })
      
      // Snapshot previous value for potential rollback
      const previousMember = queryClient.getQueryData(membersKeys.detail(memberId))
      
      // Optimistically remove from cache
      queryClient.removeQueries({ queryKey: membersKeys.detail(memberId) })
      
      return { previousMember }
    },
    onError: (err, memberId, context) => {
      // Restore member if deletion failed
      if (context?.previousMember) {
        queryClient.setQueryData(membersKeys.detail(memberId), context.previousMember)
      }
      
      toastActions.error('Deletion Failed', 'Failed to delete member. Please try again.')
    },
    onSuccess: ({ memberId, gymId }) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: membersKeys.detail(memberId) })
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
      
      if (gymId) {
        queryClient.invalidateQueries({ queryKey: membersKeys.stats(gymId) })
        queryClient.invalidateQueries({ queryKey: ['gym', 'stats', gymId] })
      }
      
      toastActions.success('Member Deleted', 'Member has been deleted successfully.')
    },
  })
}

// Bulk operations
export function useBulkUpdateMembers() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ memberIds, updates }: { memberIds: string[]; updates: Partial<Member> }) => {
      // Update each member via API (bulk update could be added to API later)
      const results = await Promise.all(
        memberIds.map(async (memberId) => {
          const params = new URLSearchParams({ id: memberId })
          const response = await fetch(`/api/members?${params}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
          const result = await response.json()
          if (!response.ok) {
            throw new Error(result.error || 'Failed to update member')
          }
          return result.member as Member
        })
      )
      
      return results
    },
    onSuccess: (updatedMembers) => {
      // Update individual member caches
      updatedMembers.forEach(member => {
        queryClient.setQueryData(membersKeys.detail(member.id), member)
      })
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
      
      const gymIds = [...new Set(updatedMembers.map(m => m.gym_id))]
      gymIds.forEach(gymId => {
        queryClient.invalidateQueries({ queryKey: membersKeys.stats(gymId) })
        queryClient.invalidateQueries({ queryKey: ['gym', 'stats', gymId] })
      })
      
      toastActions.success('Members Updated', `${updatedMembers.length} members have been updated successfully.`)
    },
    onError: () => {
      toastActions.error('Bulk Update Failed', 'Failed to update members. Please try again.')
    },
  })
}

// Utility function to refresh members data
export function useRefreshMembers() {
  const queryClient = useQueryClient()
  
  return (gymId: string) => {
    queryClient.invalidateQueries({ queryKey: membersKeys.lists() })
    queryClient.invalidateQueries({ queryKey: membersKeys.activity(gymId) })
    queryClient.invalidateQueries({ queryKey: membersKeys.stats(gymId) })
  }
}

// Prefetch function for server-side usage
export async function prefetchMembersData(queryClient: QueryClient, gymId: string, filters?: MemberFilters) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: membersKeys.list(gymId, filters),
      queryFn: async () => {
        // Note: Prefetch uses API route - ensure this runs in browser context
        const params = new URLSearchParams({ gym_id: gymId, limit: '50' })
        const response = await fetch(`/api/members?${params}`)
        const result = await response.json()
        
        if (!response.ok) throw new Error(result.error)
        
        return {
          members: result.members as Member[],
          totalCount: result.pagination?.total || 0,
          hasMore: result.pagination?.hasMore || false
        }
      },
      staleTime: 2 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: membersKeys.activity(gymId),
      queryFn: async () => [],
      staleTime: 1 * 60 * 1000,
    }),
  ])
}

// Computed hooks for common member operations
export function useMemberStats(gymId: string | null) {
  const { data: membersData } = useMembers(gymId)
  const members = membersData?.members || []
  
  return {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    inactive: members.filter(m => m.status === 'inactive').length,
    pending: members.filter(m => m.status === 'pending').length,
    withEmail: members.filter(m => m.email).length,
    withPhone: members.filter(m => m.phone_number).length,
  }
}

export function useMemberSearch(gymId: string | null, searchTerm: string) {
  return useMembers(gymId, {
    search: searchTerm,
    sortBy: 'name',
    sortOrder: 'asc',
    limit: 50
  })
} 