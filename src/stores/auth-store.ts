// src/stores/auth-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { getEnvironmentPrefix } from '@/utils/supabase/client' // Import the utility

export interface AuthUIState {
  // Client-side UI state only
  showWelcomeMessage: boolean
  lastLoginTime: number | null
  rememberEmail: string | null
  isOnboardingCompleted: boolean
  preferredLoginMethod: 'email' | 'google' | 'facebook' | null
  isNewUser: boolean // NEW: Track if this is a brand new user
  
  // UI Actions
  setShowWelcomeMessage: (show: boolean) => void
  setLastLoginTime: (time: number) => void
  setRememberEmail: (email: string | null) => void
  setOnboardingCompleted: (completed: boolean) => void
  setPreferredLoginMethod: (method: 'email' | 'google' | 'facebook' | null) => void
  setIsNewUser: (isNew: boolean) => void // NEW
  
  // Utility Actions
  clearUIState: () => void
  resetOnboarding: () => void
  markOnboardingComplete: () => void // NEW: Combined action for onboarding completion
}

// Create a prefixed name for the store
const storeName = `${getEnvironmentPrefix()}-auth-ui-store`

export const useAuthStore = create<AuthUIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial UI state
        showWelcomeMessage: false, // Changed default to false
        lastLoginTime: null,
        rememberEmail: null,
        isOnboardingCompleted: false,
        preferredLoginMethod: null,
        isNewUser: false, // NEW

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

        setIsNewUser: (isNewUser) => {
          set({ isNewUser })
        },

        // NEW: Mark onboarding as complete and set welcome message for new users
        markOnboardingComplete: () => {
          set((state) => ({
            isOnboardingCompleted: true,
            showWelcomeMessage: state.isNewUser, // Show welcome only for new users
            lastLoginTime: Date.now(),
          }))
        },

        // Utility Actions
        clearUIState: () => {
          set({
            showWelcomeMessage: false, // Changed
            lastLoginTime: null,
            rememberEmail: null,
            isOnboardingCompleted: false,
            preferredLoginMethod: null,
            isNewUser: false, // NEW
          })
        },

        resetOnboarding: () => {
          set({
            isOnboardingCompleted: false,
            showWelcomeMessage: false, // Changed
          })
        },
      }),
      {
        name: storeName, // Use the dynamic, prefixed name
        partialize: (state) => ({
          showWelcomeMessage: state.showWelcomeMessage,
          lastLoginTime: state.lastLoginTime,
          rememberEmail: state.rememberEmail,
          isOnboardingCompleted: state.isOnboardingCompleted,
          preferredLoginMethod: state.preferredLoginMethod,
          isNewUser: state.isNewUser, // NEW
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
  setIsNewUser: (isNew: boolean) => useAuthStore.getState().setIsNewUser(isNew), // NEW
  markOnboardingComplete: () => useAuthStore.getState().markOnboardingComplete(), // NEW
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
      isNewUser: state.isNewUser, // NEW
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

