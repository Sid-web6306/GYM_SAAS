// src/stores/auth-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// This store now only handles client-side UI state
// All server state (user, profile, authentication) is handled by TanStack Query in src/hooks/use-auth.ts

export interface AuthUIState {
  // Client-side UI state only
  showWelcomeMessage: boolean
  lastLoginTime: number | null
  rememberEmail: string | null
  isOnboardingCompleted: boolean
  preferredLoginMethod: 'email' | 'google' | 'facebook' | null
  
  // UI Actions
  setShowWelcomeMessage: (show: boolean) => void
  setLastLoginTime: (time: number) => void
  setRememberEmail: (email: string | null) => void
  setOnboardingCompleted: (completed: boolean) => void
  setPreferredLoginMethod: (method: 'email' | 'google' | 'facebook' | null) => void
  
  // Utility Actions
  clearUIState: () => void
  resetOnboarding: () => void
}

export const useAuthStore = create<AuthUIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial UI state
        showWelcomeMessage: true,
        lastLoginTime: null,
        rememberEmail: null,
        isOnboardingCompleted: false,
        preferredLoginMethod: null,

        // UI Actions
        setShowWelcomeMessage: (showWelcomeMessage) => {
          set({ showWelcomeMessage })
        },

        setLastLoginTime: (lastLoginTime) => {
          set({ lastLoginTime })
        },

        setRememberEmail: (rememberEmail) => {
          set({ rememberEmail })
        },

        setOnboardingCompleted: (isOnboardingCompleted) => {
          set({ isOnboardingCompleted })
        },

        setPreferredLoginMethod: (preferredLoginMethod) => {
          set({ preferredLoginMethod })
        },

        // Utility Actions
        clearUIState: () => {
          set({
            showWelcomeMessage: true,
            lastLoginTime: null,
            rememberEmail: null,
            isOnboardingCompleted: false,
            preferredLoginMethod: null,
          })
        },

        resetOnboarding: () => {
          set({
            isOnboardingCompleted: false,
            showWelcomeMessage: true,
          })
        },
      }),
      {
        name: 'auth-ui-store',
        // Persist all UI state - it's safe to persist since it's client-only
        partialize: (state) => ({
          showWelcomeMessage: state.showWelcomeMessage,
          lastLoginTime: state.lastLoginTime,
          rememberEmail: state.rememberEmail,
          isOnboardingCompleted: state.isOnboardingCompleted,
          preferredLoginMethod: state.preferredLoginMethod,
        }),
      }
    ),
    {
      name: 'auth-ui-store',
    }
  )
)

// Export convenience actions for UI state
export const authUIActions = {
  setShowWelcomeMessage: (show: boolean) => useAuthStore.getState().setShowWelcomeMessage(show),
  setLastLoginTime: (time: number) => useAuthStore.getState().setLastLoginTime(time),
  setRememberEmail: (email: string | null) => useAuthStore.getState().setRememberEmail(email),
  setOnboardingCompleted: (completed: boolean) => useAuthStore.getState().setOnboardingCompleted(completed),
  setPreferredLoginMethod: (method: 'email' | 'google' | 'facebook' | null) => useAuthStore.getState().setPreferredLoginMethod(method),
  clearUIState: () => useAuthStore.getState().clearUIState(),
  resetOnboarding: () => useAuthStore.getState().resetOnboarding(),
  
  // Helper to get current UI state
  getUIState: () => {
    const state = useAuthStore.getState()
    return {
      showWelcomeMessage: state.showWelcomeMessage,
      lastLoginTime: state.lastLoginTime,
      rememberEmail: state.rememberEmail,
      isOnboardingCompleted: state.isOnboardingCompleted,
      preferredLoginMethod: state.preferredLoginMethod,
    }
  }
}

/*
 * MIGRATION GUIDE:
 * 
 * The old auth store has been split into two parts:
 * 
 * 1. SERVER STATE (now handled by TanStack Query in src/hooks/use-auth.ts):
 *    - user: User | null
 *    - profile: Profile | null
 *    - isLoading: boolean
 *    - isAuthenticated: boolean
 *    - hasGym: boolean
 *    - All authentication actions (login, logout, fetchProfile, etc.)
 * 
 * 2. CLIENT UI STATE (this store):
 *    - showWelcomeMessage: boolean
 *    - lastLoginTime: number | null
 *    - rememberEmail: string | null
 *    - isOnboardingCompleted: boolean
 *    - preferredLoginMethod: string | null
 * 
 * HOW TO MIGRATE YOUR COMPONENTS:
 * 
 * OLD WAY (using Zustand for everything):
 * ```tsx
 * import { useAuthStore } from '@/stores/auth-store'
 * 
 * const { user, profile, isAuthenticated, logout } = useAuthStore()
 * ```
 * 
 * NEW WAY (TanStack Query for server state, Zustand for UI state):
 * ```tsx
 * import { useAuth, useLogout } from '@/hooks/use-auth'
 * import { useAuthStore } from '@/stores/auth-store'
 * 
 * // Server state
 * const { user, profile, isAuthenticated, hasGym } = useAuth()
 * const logoutMutation = useLogout()
 * 
 * // UI state
 * const { showWelcomeMessage, rememberEmail } = useAuthStore()
 * 
 * // Actions
 * const handleLogout = () => logoutMutation.mutate()
 * ```
 * 
 * BENEFITS:
 * - No more hydration issues
 * - Automatic caching and background refetching
 * - Multi-tab synchronization
 * - Better error handling
 * - Optimistic updates
 * - Proper separation of concerns
 * - Type safety with TanStack Query
 */

