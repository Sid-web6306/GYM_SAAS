// src/stores/settings-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { getEnvironmentPrefix } from '@/utils/supabase/client'

export type SettingsTab = 'profile' | 'gym' | 'subscription' | 'appearance' | 'security'

export interface SettingsState {
  // Tab state
  selectedTab: SettingsTab
  
  // Actions
  setSelectedTab: (tab: SettingsTab) => void
  resetToProfile: () => void
}

// Create dynamic store name with environment prefix for multi-environment isolation
const storeName = `${getEnvironmentPrefix()}-settings-store`

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set) => ({
        // Default state
        selectedTab: 'profile',
        
        // Actions
        setSelectedTab: (selectedTab) => {
          set({ selectedTab })
        },
        
        resetToProfile: () => {
          set({ selectedTab: 'profile' })
        },
      }),
      {
        name: storeName, // Use the dynamic, prefixed name
        partialize: (state) => ({
          selectedTab: state.selectedTab,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
)
