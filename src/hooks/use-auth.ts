import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ProfileWithRBAC } from '@/types/rbac.types'
import type { Database } from '@/types/supabase'
import { toastActions } from '@/stores/toast-store'
import { logger } from '@/lib/logger'

export interface AuthData {
  user: User | null
  profile: ProfileWithRBAC | null
  isLoading: boolean
  isAuthenticated: boolean
  hasGym: boolean
  error: Error | null
}

// Core auth query
async function fetchAuthSession(): Promise<AuthData> {
  const supabase = createClient()
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // Handle specific auth session errors more gracefully
    if (userError) {
      // If it's a session missing error, treat as unauthenticated rather than throwing
      if (userError.message?.includes('Auth session missing') || 
          userError.message?.includes('session_not_found')) {
        logger.info('Auth session missing, treating as unauthenticated')
        return {
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          hasGym: false,
          error: null
        }
      }
      
      // Handle invalid UTF-8 sequence errors (corrupted cookies)
      if (userError.message?.includes('Invalid UTF-8 sequence')) {
        logger.warn('Invalid UTF-8 in auth session, clearing corrupted cookies and treating as unauthenticated', {
          error: userError
        })
        
        // Try to clear all Supabase cookies to fix the issue
        try {
          // Robust check for process.env
          const g = globalThis as any
          const isDev = typeof g.process !== 'undefined' && g.process.env?.NODE_ENV === 'development'
          const envPrefix = isDev ? 'dev' : 'prod'
          const cookieNames = [
            `${envPrefix}-sb-access-token`,
            `${envPrefix}-sb-refresh-token`,
            `${envPrefix}-sb-provider-token`,
            `${envPrefix}-sb-provider-refresh-token`
          ]
          
          cookieNames.forEach(cookieName => {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          })
        } catch (clearError) {
          logger.warn('Failed to clear corrupted cookies', { error: clearError })
        }
        
        return {
          user: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          hasGym: false,
          error: null
        }
      }
      
      throw userError
    }
    
    if (!user) {
      return {
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        hasGym: false,
        error: null
      }
    }

    // Fetch profile for authenticated user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    logger.info('Profile fetch result:', {
      profile,
      profileError: profileError?.message,
      profileCode: profileError?.code,
      hasGymId: !!(profile?.gym_id),
      userId: user.id
    })

    // Profile not existing is not an error for new users
    const profileData = profileError?.code === 'PGRST116' ? null : profile

    // Convert PostgrestError to Error for type compatibility
    const errorToReturn = profileError?.code !== 'PGRST116' && profileError
      ? new Error(profileError.message)
      : null

    const result = {
      user: user,
      profile: profileData as ProfileWithRBAC | null,
      isLoading: false,
      isAuthenticated: true,
      hasGym: !!(profileData?.gym_id),
      error: errorToReturn
    }

    logger.info('Final auth result:', { 
      hasGym: result.hasGym, 
      hasProfile: !!result.profile,
      gymId: result.profile?.gym_id 
    })

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Handle invalid UTF-8 sequence errors (corrupted cookies)
    if (errorMessage.includes('Invalid UTF-8 sequence')) {
      logger.warn('Invalid UTF-8 in auth session (caught in catch block), clearing corrupted cookies', {
        error
      })
      
      // Try to clear all Supabase cookies to fix the issue
      try {
        if (typeof document !== 'undefined') {
          const g = globalThis as any
          const isDev = typeof g.process !== 'undefined' && g.process.env?.NODE_ENV === 'development'
          const envPrefix = isDev ? 'dev' : 'prod'
          const cookieNames = [
            `${envPrefix}-sb-access-token`,
            `${envPrefix}-sb-refresh-token`,
            `${envPrefix}-sb-provider-token`,
            `${envPrefix}-sb-provider-refresh-token`
          ]
          
          cookieNames.forEach(cookieName => {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
          })
        }
      } catch (clearError) {
        logger.warn('Failed to clear corrupted cookies in catch block', { error: clearError })
      }
      
      return {
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
        hasGym: false,
        error: null
      }
    }
    
    logger.error('Auth session fetch error:', { error })
    return {
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      hasGym: false,
      error: error as Error
    }
  }
}

// Main auth hook
export function useAuth() {
  const queryClient = useQueryClient()

  const authQuery = useQuery({
    queryKey: ['auth-session'],
    queryFn: fetchAuthSession,
    staleTime: 10 * 60 * 1000, // 10 minutes - auth data doesn't change frequently
    retry: (failureCount, error) => {
      const errorMessage = error?.message || String(error || '')
      
      // Don't retry on auth session missing errors
      if (errorMessage.includes('Auth session missing') || 
          errorMessage.includes('session_not_found')) {
        return false
      }
      
      // Don't retry on invalid UTF-8 errors (corrupted cookies)
      if (errorMessage.includes('Invalid UTF-8 sequence')) {
        return false
      }
      
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false, // Only refetch if data is stale (respects staleTime) - middleware already validates
  })

  // Auth state changes are now handled globally in SessionProvider
  // to prevent redundant listeners and excessive API calls.

  return {
    user: authQuery.data?.user || null,
    profile: authQuery.data?.profile || null,
    isLoading: authQuery.isLoading,
    isAuthenticated: authQuery.data?.isAuthenticated || false,
    hasGym: authQuery.data?.hasGym || false,
    error: authQuery.error,
    refetch: authQuery.refetch,
  }
}

// Logout mutation
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      logger.info('Starting logout process...')
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('Supabase signOut error:', { error })
        throw error
      }
      logger.info('Supabase signOut successful')
      return { success: true, message: 'Logged out successfully' }
    },
    onSuccess: (result) => {
      logger.info('Logout onSuccess called:', { result })
      
      // Show success toast using toastActions
      toastActions.success('Logged Out', 'You have been successfully logged out')
      
      queryClient.clear() // Clear all cached data
      
      // Delay redirect slightly to show toast
      setTimeout(() => {
        router.push('/login')
      }, 500)
    },
    onError: (error) => {
      logger.error('Logout onError called:', { error })
      
      // Show error toast using toastActions
      toastActions.error('Logout Failed', error.message || 'An error occurred during logout')
      
      // Force redirect even on error
      queryClient.clear()
      setTimeout(() => {
        router.push('/login')
      }, 500)
    }
  })
}

// Auth guard hook for conditional rendering (middleware handles redirects)
export function useAuthGuard(options: {
  requireAuth?: boolean
  requireGym?: boolean
} = {}) {
  const { requireAuth = true, requireGym = false } = options
  const { isAuthenticated, hasGym, isLoading } = useAuth()

  return {
    isAuthenticated,
    hasGym,
    isLoading,
    canAccess: !isLoading && (!requireAuth || isAuthenticated) && (!requireGym || hasGym),
  }
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Database['public']['Tables']['profiles']['Update']) => {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('Authentication required')
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return data as ProfileWithRBAC
    },
    onMutate: async (updates) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['auth-session'] })
      
      const previousAuth = queryClient.getQueryData(['auth-session'])
      
      queryClient.setQueryData(['auth-session'], (old: AuthData | undefined) => {
        if (!old) return old
        return {
          ...old,
          profile: old.profile ? { ...old.profile, ...updates } : null,
        }
      })

      return { previousAuth }
    },
    onError: (error, _updates, context) => {
      // Rollback optimistic update
      if (context?.previousAuth) {
        queryClient.setQueryData(['auth-session'], context.previousAuth)
      }
      
      logger.error('Profile update error:', { error })
      toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-session'] })
      toastActions.success('Profile Updated', 'Your profile has been updated successfully.')
    },
  })
}

// Post-onboarding sync for refreshing data
// Debounce helper to prevent multiple rapid calls
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DEBOUNCE_MS = 500

export function usePostOnboardingSync() {
  const queryClient = useQueryClient()

  return async () => {
    // Debounce to prevent multiple rapid calls
    return new Promise<{ data: AuthData | undefined; error: Error | null }>((resolve) => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer)
      }
      
      syncDebounceTimer = setTimeout(async () => {
        try {
          // Invalidate queries instead of removing - this respects cache and only refetches if stale
          // This is more efficient and prevents unnecessary API calls
          await queryClient.invalidateQueries({ queryKey: ['auth-session'] })
          await queryClient.invalidateQueries({ queryKey: ['gym'] })
          await queryClient.invalidateQueries({ queryKey: ['members'] })
          
          // Get the updated data from cache (or it will refetch if stale)
          const authData = queryClient.getQueryData<AuthData>(['auth-session'])
          
          resolve({ data: authData, error: null })
        } catch (error) {
          resolve({ data: undefined, error: error as Error })
        } finally {
          syncDebounceTimer = null
        }
      }, SYNC_DEBOUNCE_MS)
    })
  }
}

// Simplified auth session hook for backward compatibility
export function useAuthSession() {
  const { user } = useAuth()
  return { 
    user, 
    sessionId: user?.id?.slice(-10), // Simple session ID from user ID
    lastRefresh: Date.now() 
  }
}

// Simplified auth metrics hook for backward compatibility
export function useAuthMetrics() {
  return {
    refreshCount: 1,
    lastActivity: Date.now(),
    tabCount: 1,
    isHealthy: true,
    errorCount: 0,
    sessionDuration: 300000 // 5 minutes in milliseconds
  }
}
