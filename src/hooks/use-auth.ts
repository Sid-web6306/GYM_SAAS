import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ProfileWithRBAC } from '@/types/rbac.types'
import type { Database } from '@/types/supabase'
import { toastActions } from '@/stores/toast-store'

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
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) throw sessionError
    if (!session?.user) {
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
      .eq('id', session.user.id)
      .single()

    console.log('🔧 CLIENT AUTH: Profile fetch result:', {
      profile,
      profileError: profileError?.message,
      profileCode: profileError?.code,
      hasGymId: !!(profile?.gym_id),
      userId: session.user.id
    })

    // Profile not existing is not an error for new users
    const profileData = profileError?.code === 'PGRST116' ? null : profile

    const result = {
      user: session.user,
      profile: profileData as ProfileWithRBAC | null,
      isLoading: false,
      isAuthenticated: true,
      hasGym: !!(profileData?.gym_id),
      error: profileError?.code !== 'PGRST116' ? profileError : null
    }

    console.log('🔧 CLIENT AUTH: Final auth result:', { 
      hasGym: result.hasGym, 
      hasProfile: !!result.profile,
      gymId: result.profile?.gym_id 
    })

    return result
  } catch (error) {
    console.error('Auth session fetch error:', error)
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })

  // Handle auth state changes
  useEffect(() => {
    const supabase = createClient()
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: ['auth-session'] })
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

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
      console.log('🔧 LOGOUT: Starting logout process...')
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('🔧 LOGOUT: Supabase signOut error:', error)
        throw error
      }
      console.log('🔧 LOGOUT: Supabase signOut successful')
      return { success: true, message: 'Logged out successfully' }
    },
    onSuccess: (result) => {
      console.log('🔧 LOGOUT: onSuccess called with:', result)
      
      // Show success toast using toastActions
      toastActions.success('Logged Out', 'You have been successfully logged out')
      
      queryClient.clear() // Clear all cached data
      
      // Delay redirect slightly to show toast
      setTimeout(() => {
        router.push('/login')
      }, 500)
    },
    onError: (error) => {
      console.error('🔧 LOGOUT: onError called with:', error)
      
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
      
      console.error('Profile update error:', error)
      toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-session'] })
      toastActions.success('Profile Updated', 'Your profile has been updated successfully.')
    },
  })
}

// Post-onboarding sync for refreshing data
export function usePostOnboardingSync() {
  const { refetch } = useAuth()
  const queryClient = useQueryClient()

  return async () => {
    queryClient.removeQueries({ queryKey: ['auth-session'] })
    const result = await refetch()
    
    queryClient.removeQueries({ queryKey: ['gym'] })
    queryClient.removeQueries({ queryKey: ['members'] })
    
    return result
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
