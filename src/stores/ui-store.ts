// src/stores/ui-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { getEnvironmentPrefix } from '@/utils/supabase/client'

export interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean
  sidebarCollapsedMobile: boolean
  
  // Theme preferences
  preferredTheme: 'light' | 'dark' | 'system'
  
  // Layout preferences
  compactMode: boolean
  showTooltips: boolean
  
  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarCollapsedMobile: (collapsed: boolean) => void
  toggleSidebar: () => void
  toggleMobileSidebar: () => void
  setPreferredTheme: (theme: 'light' | 'dark' | 'system') => void
  setCompactMode: (compact: boolean) => void
  setShowTooltips: (show: boolean) => void
  
  // Utility Actions
  resetUIState: () => void
}

// Create a prefixed name for the store
const storeName = `${getEnvironmentPrefix()}-ui-store`

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        sidebarCollapsed: false,
        sidebarCollapsedMobile: true, // Mobile starts collapsed
        preferredTheme: 'system',
        compactMode: false,
        showTooltips: true,

        // Sidebar actions
        setSidebarCollapsed: (sidebarCollapsed) => {
          set({ sidebarCollapsed })
        },

        setSidebarCollapsedMobile: (sidebarCollapsedMobile) => {
          set({ sidebarCollapsedMobile })
        },

        toggleSidebar: () => {
          set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        toggleMobileSidebar: () => {
          set((state) => ({ sidebarCollapsedMobile: !state.sidebarCollapsedMobile }))
        },

        // Theme actions
        setPreferredTheme: (preferredTheme) => {
          set({ preferredTheme })
        },

        // Layout actions
        setCompactMode: (compactMode) => {
          set({ compactMode })
        },

        setShowTooltips: (showTooltips) => {
          set({ showTooltips })
        },

        // Utility actions
        resetUIState: () => {
          set({
            sidebarCollapsed: false,
            sidebarCollapsedMobile: true,
            preferredTheme: 'system',
            compactMode: false,
            showTooltips: true,
          })
        },
      }),
      {
        name: storeName,
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          preferredTheme: state.preferredTheme,
          compactMode: state.compactMode,
          showTooltips: state.showTooltips,
          // Don't persist mobile state as it should reset on page refresh
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
)

// Export convenience actions
export const uiActions = {
  setSidebarCollapsed: (collapsed: boolean) => useUIStore.getState().setSidebarCollapsed(collapsed),
  setSidebarCollapsedMobile: (collapsed: boolean) => useUIStore.getState().setSidebarCollapsedMobile(collapsed),
  toggleSidebar: () => useUIStore.getState().toggleSidebar(),
  toggleMobileSidebar: () => useUIStore.getState().toggleMobileSidebar(),
  setPreferredTheme: (theme: 'light' | 'dark' | 'system') => useUIStore.getState().setPreferredTheme(theme),
  setCompactMode: (compact: boolean) => useUIStore.getState().setCompactMode(compact),
  setShowTooltips: (show: boolean) => useUIStore.getState().setShowTooltips(show),
  resetUIState: () => useUIStore.getState().resetUIState(),
  
  // Helper to get current UI state
  getUIState: () => {
    const state = useUIStore.getState()
    return {
      sidebarCollapsed: state.sidebarCollapsed,
      sidebarCollapsedMobile: state.sidebarCollapsedMobile,
      preferredTheme: state.preferredTheme,
      compactMode: state.compactMode,
      showTooltips: state.showTooltips,
    }
  }
}

// Hook for sidebar-specific state
export const useSidebarState = () => {
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)
  const sidebarCollapsedMobile = useUIStore((state) => state.sidebarCollapsedMobile)
  const showTooltips = useUIStore((state) => state.showTooltips)
  const toggleSidebar = useUIStore((state) => state.toggleSidebar)
  const toggleMobileSidebar = useUIStore((state) => state.toggleMobileSidebar)
  
  return {
    sidebarCollapsed,
    sidebarCollapsedMobile,
    showTooltips,
    toggleSidebar,
    toggleMobileSidebar,
  }
}
