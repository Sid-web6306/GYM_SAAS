// src/stores/members-store.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'

export interface Member {
  id: string
  gym_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone_number: string | null
  status: string | null
  join_date: string | null
  created_at: string
}

export interface MemberActivity {
  id: string
  member_id: string
  activity_type: string
  timestamp: string
  member?: Member
}

export interface MembersState {
  // State
  members: Member[]
  recentActivity: MemberActivity[]
  selectedMember: Member | null
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  lastFetch: number | null
  
  // Filters and search
  searchQuery: string
  statusFilter: string | null
  sortBy: 'name' | 'join_date' | 'status'
  sortOrder: 'asc' | 'desc'
  
  // Actions
  setMembers: (members: Member[]) => void
  setRecentActivity: (activity: MemberActivity[]) => void
  setSelectedMember: (member: Member | null) => void
  setSearchQuery: (query: string) => void
  setStatusFilter: (status: string | null) => void
  setSorting: (sortBy: 'name' | 'join_date' | 'status', order: 'asc' | 'desc') => void
  
  fetchMembers: (gymId: string) => Promise<void>
  fetchRecentActivity: () => Promise<void>
  createMember: (gymId: string, memberData: Partial<Member>) => Promise<Member>
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>
  deleteMember: (memberId: string) => Promise<void>
  refreshMembers: (gymId: string) => Promise<void>
  
  // Computed getters
  getFilteredMembers: () => Member[]
  getMemberById: (id: string) => Member | undefined
  getActiveMembers: () => Member[]
  getInactiveMembers: () => Member[]
  getTotalMembers: () => number
  isDataStale: () => boolean
}

const DATA_CACHE_TIME = 2 * 60 * 1000 // 2 minutes

export const useMembersStore = create<MembersState>()(
  devtools(
    (set, get) => ({
      // Initial state
      members: [],
      recentActivity: [],
      selectedMember: null,
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      lastFetch: null,
      
      // Filters
      searchQuery: '',
      statusFilter: null,
      sortBy: 'name',
      sortOrder: 'asc',

      // Setters
      setMembers: (members) => {
        set({ members, lastFetch: Date.now() })
      },

      setRecentActivity: (recentActivity) => {
        set({ recentActivity })
      },

      setSelectedMember: (selectedMember) => {
        set({ selectedMember })
      },

      setSearchQuery: (searchQuery) => {
        set({ searchQuery })
      },

      setStatusFilter: (statusFilter) => {
        set({ statusFilter })
      },

      setSorting: (sortBy, sortOrder) => {
        set({ sortBy, sortOrder })
      },

      // Fetch members
      fetchMembers: async (gymId) => {
        const supabase = createClient()
        
        try {
          set({ isLoading: true })
          
          const { data: members, error } = await supabase
            .from('members')
            .select('*')
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false })

          if (!error && members) {
            set({ members, lastFetch: Date.now() })
          } else {
            console.error('Members fetch error:', error)
          }
        } catch (error) {
          console.error('Members fetch error:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Fetch recent activity
      fetchRecentActivity: async () => {
        try {
          // For now, create mock activity based on members
          const { members } = get()
          
          const mockActivity: MemberActivity[] = members.slice(0, 10).map((member, index) => ({
            id: `activity-${member.id}-${index}`,
            member_id: member.id,
            activity_type: Math.random() > 0.5 ? 'check_in' : 'check_out',
            timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            member,
          }))
          
          set({ recentActivity: mockActivity })
        } catch (error) {
          console.error('Activity fetch error:', error)
        }
      },

      // Create new member
      createMember: async (gymId, memberData) => {
        const supabase = createClient()
        
        try {
          set({ isCreating: true })
          
          const { data: newMember, error } = await supabase
            .from('members')
            .insert({
              gym_id: gymId,
              ...memberData,
              status: memberData.status || 'active',
              join_date: memberData.join_date || new Date().toISOString(),
            })
            .select()
            .single()

          if (!error && newMember) {
            set((state) => ({
              members: [newMember, ...state.members]
            }))
            return newMember
          } else {
            console.error('Member creation error:', error)
            throw error
          }
        } catch (error) {
          console.error('Member creation error:', error)
          throw error
        } finally {
          set({ isCreating: false })
        }
      },

      // Update member
      updateMember: async (memberId, updates) => {
        const supabase = createClient()
        
        try {
          set({ isUpdating: true })
          
          const { data: updatedMember, error } = await supabase
            .from('members')
            .update(updates)
            .eq('id', memberId)
            .select()
            .single()

          if (!error && updatedMember) {
            set((state) => ({
              members: state.members.map(member =>
                member.id === memberId ? updatedMember : member
              ),
              selectedMember: state.selectedMember?.id === memberId ? updatedMember : state.selectedMember
            }))
          } else {
            console.error('Member update error:', error)
            throw error
          }
        } catch (error) {
          console.error('Member update error:', error)
          throw error
        } finally {
          set({ isUpdating: false })
        }
      },

      // Delete member
      deleteMember: async (memberId) => {
        const supabase = createClient()
        
        try {
          const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', memberId)

          if (!error) {
            set((state) => ({
              members: state.members.filter(member => member.id !== memberId),
              selectedMember: state.selectedMember?.id === memberId ? null : state.selectedMember
            }))
          } else {
            console.error('Member deletion error:', error)
            throw error
          }
        } catch (error) {
          console.error('Member deletion error:', error)
          throw error
        }
      },

      // Refresh members data
      refreshMembers: async (gymId) => {
        await get().fetchMembers(gymId)
        await get().fetchRecentActivity()
      },

      // Computed getters
      getFilteredMembers: () => {
        const { members, searchQuery, statusFilter, sortBy, sortOrder } = get()
        
        let filtered = members
        
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(member =>
            member.first_name?.toLowerCase().includes(query) ||
            member.last_name?.toLowerCase().includes(query) ||
            member.email?.toLowerCase().includes(query)
          )
        }
        
        // Apply status filter
        if (statusFilter) {
          filtered = filtered.filter(member => member.status === statusFilter)
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
          let aValue: string | number = ''
          let bValue: string | number = ''
          
          switch (sortBy) {
            case 'name':
              aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase()
              bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase()
              break
            case 'join_date':
              aValue = new Date(a.join_date || a.created_at).getTime()
              bValue = new Date(b.join_date || b.created_at).getTime()
              break
            case 'status':
              aValue = a.status || ''
              bValue = b.status || ''
              break
          }
          
          if (sortOrder === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
          } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
          }
        })
        
        return filtered
      },

      getMemberById: (id) => {
        const { members } = get()
        return members.find(member => member.id === id)
      },

      getActiveMembers: () => {
        const { members } = get()
        return members.filter(member => member.status === 'active')
      },

      getInactiveMembers: () => {
        const { members } = get()
        return members.filter(member => member.status !== 'active')
      },

      getTotalMembers: () => {
        const { members } = get()
        return members.length
      },

      isDataStale: () => {
        const { lastFetch } = get()
        if (!lastFetch) return true
        return Date.now() - lastFetch > DATA_CACHE_TIME
      },
    }),
    {
      name: 'members-store',
    }
  )
)

// Export convenience actions
export const membersActions = {
  fetchMembers: (gymId: string) => useMembersStore.getState().fetchMembers(gymId),
  fetchRecentActivity: () => useMembersStore.getState().fetchRecentActivity(),
  createMember: (gymId: string, memberData: Partial<Member>) => useMembersStore.getState().createMember(gymId, memberData),
  updateMember: (memberId: string, updates: Partial<Member>) => useMembersStore.getState().updateMember(memberId, updates),
  deleteMember: (memberId: string) => useMembersStore.getState().deleteMember(memberId),
  refreshMembers: (gymId: string) => useMembersStore.getState().refreshMembers(gymId),
  setSearchQuery: (query: string) => useMembersStore.getState().setSearchQuery(query),
  setStatusFilter: (status: string | null) => useMembersStore.getState().setStatusFilter(status),
  setSorting: (sortBy: 'name' | 'join_date' | 'status', order: 'asc' | 'desc') => useMembersStore.getState().setSorting(sortBy, order),
}



export const membersSelectors = {
  getFilteredMembers: () => useMembersStore.getState().getFilteredMembers(),
  getMemberById: (id: string) => useMembersStore.getState().getMemberById(id),
  getActiveMembers: () => useMembersStore.getState().getActiveMembers(),
  getInactiveMembers: () => useMembersStore.getState().getInactiveMembers(),
  getTotalMembers: () => useMembersStore.getState().getTotalMembers(),
  isDataStale: () => useMembersStore.getState().isDataStale(),
}