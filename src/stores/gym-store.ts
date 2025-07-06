// src/stores/gym-store.ts

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createClient } from '@/utils/supabase/client'

export interface Gym {
  id: string
  name: string | null
  created_at: string
}

export interface GymStats {
  totalMembers: number
  activeMembers: number
  newMembersThisMonth: number
  monthlyRevenue: number
  todayCheckins: number
  averageDailyCheckins: number
}

export interface GymState {
  // State
  gym: Gym | null
  stats: GymStats | null
  isLoading: boolean
  lastUpdated: number | null
  
  // Actions
  setGym: (gym: Gym | null) => void
  setStats: (stats: GymStats) => void
  fetchGym: (gymId: string) => Promise<void>
  fetchStats: (gymId: string) => Promise<void>
  updateGym: (gymId: string, updates: Partial<Gym>) => Promise<void>
  refreshData: (gymId: string) => Promise<void>
  clearGym: () => void
  
  // Computed getters
  getGymName: () => string
  getTotalMembers: () => number
  getActiveMembers: () => number
  getMonthlyRevenue: () => number
  isStatsStale: () => boolean
}

const STATS_CACHE_TIME = 5 * 60 * 1000 // 5 minutes

export const useGymStore = create<GymState>()(
  devtools(
    (set, get) => ({
      // Initial state
      gym: null,
      stats: null,
      isLoading: false,
      lastUpdated: null,

      // Set gym
      setGym: (gym) => {
        set({ gym })
      },

      // Set stats
      setStats: (stats) => {
        set({ stats, lastUpdated: Date.now() })
      },

      // Fetch gym details
      fetchGym: async (gymId) => {
        const supabase = createClient()
        
        try {
          set({ isLoading: true })
          
          const { data: gym, error } = await supabase
            .from('gyms')
            .select('*')
            .eq('id', gymId)
            .single()

          if (!error && gym) {
            set({ gym })
          } else if (error) {
            // Only log error if it's not a "not found" error
            if (error.code !== 'PGRST116') {
              console.error('Gym fetch error:', error)
            }
          }
        } catch (error) {
          console.error('Gym fetch error:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Fetch gym statistics
      fetchStats: async (gymId) => {
        const supabase = createClient()
        
        try {
          set({ isLoading: true })
          
          // Fetch members data
          const { data: members, error: membersError } = await supabase
            .from('members')
            .select('created_at, status, join_date')
            .eq('gym_id', gymId)

          if (!membersError && members) {
            const now = new Date()
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            
            const totalMembers = members.length
            const activeMembers = members.filter(m => m.status === 'active').length
            const newMembersThisMonth = members.filter(m => 
              new Date(m.created_at) >= startOfMonth
            ).length

            const stats: GymStats = {
              totalMembers,
              activeMembers,
              newMembersThisMonth,
              monthlyRevenue: activeMembers * 50, // $50 per active member
              todayCheckins: Math.floor(Math.random() * 20) + 5, // Placeholder
              averageDailyCheckins: Math.floor(activeMembers * 0.3), // 30% daily attendance
            }

            set({ stats, lastUpdated: Date.now() })
          } else {
            console.error('Members fetch error:', membersError)
          }
        } catch (error) {
          console.error('Stats fetch error:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      // Update gym details
      updateGym: async (gymId, updates) => {
        const supabase = createClient()
        
        try {
          set({ isLoading: true })
          
          const { data: updatedGym, error } = await supabase
            .from('gyms')
            .update(updates)
            .eq('id', gymId)
            .select()
            .single()

          if (!error && updatedGym) {
            set({ gym: updatedGym })
          } else {
            console.error('Gym update error:', error)
            throw error
          }
        } catch (error) {
          console.error('Gym update error:', error)
          throw error
        } finally {
          set({ isLoading: false })
        }
      },

      // Refresh all gym data
      refreshData: async (gymId) => {
        await Promise.all([
          get().fetchGym(gymId),
          get().fetchStats(gymId)
        ])
      },

      // Clear gym data
      clearGym: () => {
        set({
          gym: null,
          stats: null,
          lastUpdated: null,
          isLoading: false
        })
      },

      // Computed getters
      getGymName: () => {
        const { gym } = get()
        return gym?.name || 'My Gym'
      },

      getTotalMembers: () => {
        const { stats } = get()
        return stats?.totalMembers || 0
      },

      getActiveMembers: () => {
        const { stats } = get()
        return stats?.activeMembers || 0
      },

      getMonthlyRevenue: () => {
        const { stats } = get()
        return stats?.monthlyRevenue || 0
      },

      isStatsStale: () => {
        const { lastUpdated } = get()
        if (!lastUpdated) return true
        return Date.now() - lastUpdated > STATS_CACHE_TIME
      },
    }),
    {
      name: 'gym-store',
    }
  )
)

// Export convenience actions
export const gymActions = {
  fetchGym: (gymId: string) => useGymStore.getState().fetchGym(gymId),
  fetchStats: (gymId: string) => useGymStore.getState().fetchStats(gymId),
  updateGym: (gymId: string, updates: Partial<Gym>) => useGymStore.getState().updateGym(gymId, updates),
  refreshData: (gymId: string) => useGymStore.getState().refreshData(gymId),
  clearGym: () => useGymStore.getState().clearGym(),
}



export const gymSelectors = {
  getGymName: () => useGymStore.getState().getGymName(),
  getTotalMembers: () => useGymStore.getState().getTotalMembers(),
  getActiveMembers: () => useGymStore.getState().getActiveMembers(),
  getMonthlyRevenue: () => useGymStore.getState().getMonthlyRevenue(),
  isStatsStale: () => useGymStore.getState().isStatsStale(),
}