import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { toastActions } from '@/stores/toast-store'
import { useEffect } from 'react'

// Types
export interface Member {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  status: string | null
  join_date: string | null
  gym_id: string
  created_at: string
  updated_at?: string
}

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

// Enhanced Members List Hook with pagination and real-time updates
export function useMembers(gymId: string | null, filters?: MemberFilters) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: membersKeys.list(gymId || '', filters),
    queryFn: async (): Promise<MembersResponse> => {
      if (!gymId) throw new Error('Gym ID is required')
      
      const supabase = createClient()
      let query = supabase
        .from('members')
        .select('*', { count: 'exact' })
        .eq('gym_id', gymId)

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`
        query = query.or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'created_at'
      const sortOrder = filters?.sortOrder || 'desc'
      
      if (sortBy === 'name') {
        query = query.order('first_name', { ascending: sortOrder === 'asc' })
      } else {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      }

      // Apply pagination
      if (filters?.limit) {
        const offset = filters?.offset || 0
        query = query.range(offset, offset + filters.limit - 1)
      }

      const { data, error, count } = await query

      if (error) {
        console.error('Members fetch error:', error)
        throw error
      }

      return {
        members: data as Member[],
        totalCount: count || 0,
        hasMore: filters?.limit ? (count || 0) > (filters.offset || 0) + data.length : false
      }
    },
    enabled: !!gymId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: { members: [], totalCount: 0, hasMore: false },
  })

  // Set up real-time subscription for members (without toasts - mutations handle them)
  useEffect(() => {
    if (!gymId) return

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
          console.log('Members real-time update:', payload)
          
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
  }, [gymId, queryClient])

  return query
}

// Single Member Hook with real-time updates
export function useMember(memberId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: membersKeys.detail(memberId || ''),
    queryFn: async () => {
      if (!memberId) throw new Error('Member ID is required')
      
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', memberId)
        .single()
      
      if (error) {
        console.error('Member fetch error:', error)
        throw error
      }
      
      return data as Member
    },
    enabled: !!memberId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Real-time subscription for single member
  useEffect(() => {
    if (!memberId) return

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
  }, [memberId, queryClient])

  return query
}

// Recent Activity Hook with mock data (replace with real implementation)
export function useRecentActivity(gymId: string | null) {
  return useQuery({
    queryKey: membersKeys.activity(gymId || ''),
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      // Get some recent members for mock activity
      const supabase = createClient()
      const { data: members } = await supabase
        .from('members')
        .select('id, first_name, last_name')
        .eq('gym_id', gymId)
        .limit(10)
      
      // Generate mock activity data
      const mockActivity: MemberActivity[] = (members || []).slice(0, 5).map((member, index) => ({
        id: `activity-${member.id}-${index}`,
        member_id: member.id,
        activity_type: Math.random() > 0.5 ? 'check_in' : 'check_out',
        timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        member: member as Member,
      }))
      
      return mockActivity
    },
    enabled: !!gymId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Members Stats Hook
export function useMembersStats(gymId: string | null) {
  return useQuery({
    queryKey: membersKeys.stats(gymId || ''),
    queryFn: async () => {
      if (!gymId) throw new Error('Gym ID is required')
      
      const supabase = createClient()
      const { data: members, error } = await supabase
        .from('members')
        .select('status, created_at, join_date')
        .eq('gym_id', gymId)

      if (error) {
        console.error('Members stats fetch error:', error)
        throw error
      }

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))

      return {
        total: members.length,
        active: members.filter(m => m.status === 'active').length,
        inactive: members.filter(m => m.status === 'inactive').length,
        pending: members.filter(m => m.status === 'pending').length,
        newThisMonth: members.filter(m => new Date(m.created_at) >= startOfMonth).length,
        newThisWeek: members.filter(m => new Date(m.created_at) >= startOfWeek).length,
      }
    },
    enabled: !!gymId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Enhanced Create Member with optimistic updates
export function useCreateMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ gymId, memberData }: { gymId: string; memberData: CreateMemberData }) => {
      const supabase = createClient()
      
      const newMember = {
        ...memberData,
        gym_id: gymId,
        status: memberData.status || 'active',
        join_date: memberData.join_date || new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
      
      const { data, error } = await supabase
        .from('members')
        .insert(newMember)
        .select()
        .single()
      
      if (error) {
        console.error('Member creation error:', error)
        throw error
      }
      
      return data as Member
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
      console.error('Failed to create member:', error)
      toastActions.error('Creation Failed', 'Failed to add member. Please try again.')
    },
  })
}

// Enhanced Update Member with optimistic updates
export function useUpdateMember() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: Partial<Member> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId)
        .select()
        .single()
      
      if (error) {
        console.error('Member update error:', error)
        throw error
      }
      
      return data as Member
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
      const supabase = createClient()
      
      // Get member data before deletion for cleanup
      const { data: member } = await supabase
        .from('members')
        .select('gym_id')
        .eq('id', memberId)
        .single()
      
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId)
      
      if (error) {
        console.error('Member deletion error:', error)
        throw error
      }
      
      return { memberId, gymId: member?.gym_id }
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
      const supabase = createClient()
      const { data, error } = await supabase
        .from('members')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .in('id', memberIds)
        .select()
      
      if (error) {
        console.error('Bulk member update error:', error)
        throw error
      }
      
      return data as Member[]
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
        const supabase = createClient()
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('gym_id', gymId)
          .order('created_at', { ascending: false })
          .limit(50) // Reasonable prefetch limit
        
        if (error) throw error
        
        return {
          members: data as Member[],
          totalCount: data.length,
          hasMore: false
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