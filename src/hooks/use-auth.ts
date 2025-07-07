import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useCallback } from 'react'
import { toastActions } from '@/stores/toast-store'
import type { User } from '@supabase/supabase-js'

// Types
export interface Profile {
  id: string
  full_name: string | null
  gym_id: string | null
  created_at: string
  updated_at?: string
}

export interface AuthSession {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
}

// Query Keys - centralized for consistency
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
}

// Enhanced Multi-tab session management
class MultiTabSessionManager {
  private static instance: MultiTabSessionManager
  private listeners: Set<(session: AuthSession) => void> = new Set()
  private currentSession: AuthSession | null = null
  private broadcastChannel: BroadcastChannel | null = null
  private storageKey = 'auth-session-sync'
  private boundHandleStorageEvent: (event: StorageEvent) => void
  private boundCleanup: () => void
  
  constructor() {
    this.boundHandleStorageEvent = this.handleStorageEvent.bind(this)
    this.boundCleanup = this.cleanup.bind(this)
    
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('auth-sync')
        this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this))
      } catch (err) {
        console.warn('BroadcastChannel not supported, using localStorage fallback:', err)
        this.broadcastChannel = null
      }
      
      window.addEventListener('storage', this.boundHandleStorageEvent)
      window.addEventListener('beforeunload', this.boundCleanup)
    }
  }
  
  static getInstance(): MultiTabSessionManager {
    if (!MultiTabSessionManager.instance) {
      MultiTabSessionManager.instance = new MultiTabSessionManager()
    }
    return MultiTabSessionManager.instance
  }
  
  isChannelValid(): boolean {
    return this.broadcastChannel !== null
  }
  
  subscribe(callback: (session: AuthSession) => void): () => void {
    this.listeners.add(callback)
    
    if (this.currentSession) {
      callback(this.currentSession)
    }
    
    return () => {
      this.listeners.delete(callback)
    }
  }
  
  broadcast(session: AuthSession, source = 'local') {
    this.currentSession = session
    
    this.listeners.forEach(callback => {
      try {
        callback(session)
      } catch (err) {
        console.warn('Error in session listener:', err)
      }
    })
    
    if (source === 'local') {
      const message = {
        type: 'auth-session-change',
        session,
        timestamp: Date.now(),
        source: 'broadcast'
      }
      
      // Check if channel exists and is not closed before posting
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(message)
        } catch (err) {
          console.warn('Failed to broadcast via BroadcastChannel:', err)
          // Channel might be closed, set to null to prevent further attempts
          this.broadcastChannel = null
        }
      }
      
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(message))
        localStorage.removeItem(this.storageKey)
      } catch (err) {
        console.warn('Failed to broadcast via localStorage:', err)
      }
    }
  }
  
  private handleBroadcastMessage(event: MessageEvent) {
    try {
      if (event.data?.type === 'auth-session-change' && event.data?.source === 'broadcast') {
        this.broadcast(event.data.session, 'remote')
      }
    } catch (err) {
      console.warn('Error handling broadcast message:', err)
    }
  }
  
  private handleStorageEvent(event: StorageEvent) {
    if (event.key === this.storageKey && event.newValue) {
      try {
        const message = JSON.parse(event.newValue)
        if (message.type === 'auth-session-change') {
          this.broadcast(message.session, 'remote')
        }
      } catch (err) {
        console.warn('Failed to parse storage event:', err)
      }
    }
  }
  
  cleanup() {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close()
      } catch (err) {
        console.warn('Error closing BroadcastChannel:', err)
      } finally {
        this.broadcastChannel = null
      }
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.boundHandleStorageEvent)
      window.removeEventListener('beforeunload', this.boundCleanup)
    }
    
    this.listeners.clear()
  }
}

// Enhanced Session Hook with better error handling
export function useAuthSession() {
  const queryClient = useQueryClient()
  const sessionManager = useRef<MultiTabSessionManager | null>(null)
  
  if (!sessionManager.current) {
    sessionManager.current = MultiTabSessionManager.getInstance()
  }
  
  const sessionQuery = useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<AuthSession> => {
      const supabase = createClient()
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Session fetch error:', error)
          throw error
        }
        
        let profile: Profile | null = null
        
        if (session?.user) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!profileError && profileData) {
            profile = profileData
          } else if (profileError && profileError.code !== 'PGRST116') {
            // Log error if it's not "not found"
            console.error('Profile fetch error:', profileError)
          }
        }
        
        const authSession: AuthSession = {
          user: session?.user || null,
          profile,
          isLoading: false,
          isInitialized: true
        }
        
        try {
          sessionManager.current?.broadcast(authSession, 'local')
        } catch (err) {
          console.warn('Error broadcasting auth session:', err)
        }
        
        return authSession
        
      } catch (error) {
        console.error('Session query error:', error)
        
        const errorSession: AuthSession = {
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true
        }
        
        try {
          sessionManager.current?.broadcast(errorSession, 'local')
        } catch (err) {
          console.warn('Error broadcasting error session:', err)
        }
        
        return errorSession
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message
        if (errorMessage.includes('session_expired') || errorMessage.includes('invalid_jwt')) {
          return false
        }
      }
      return failureCount < 3
    },
  })
  
  // Enhanced auth state change listener with deduplication
  useEffect(() => {
    const supabase = createClient()
    let lastEventTime = 0
    let lastEventType = ''
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        
        // Prevent duplicate events within 1 second
        const now = Date.now()
        const eventKey = `${event}-${session?.user?.id || 'none'}`
        if (now - lastEventTime < 1000 && lastEventType === eventKey) {
          console.log('Skipping duplicate auth event:', event)
          return
        }
        lastEventTime = now
        lastEventType = eventKey
        
        // Handle specific events (remove toasts - mutations handle user feedback)
        if (event === 'SIGNED_OUT') {
          queryClient.removeQueries({ queryKey: authKeys.all })
          
          try {
            sessionManager.current?.broadcast({
              user: null,
              profile: null,
              isLoading: false,
              isInitialized: true
            }, 'local')
          } catch (err) {
            console.warn('Error broadcasting signed out session:', err)
          }
          // No toast - logout mutation handles this
        } else if (event === 'SIGNED_IN') {
          // Invalidate and refetch session data
          queryClient.invalidateQueries({ queryKey: authKeys.session() })
          // No toast - login actions handle this
        } else if (event === 'TOKEN_REFRESHED') {
          // Token refreshed, update session
          queryClient.invalidateQueries({ queryKey: authKeys.session() })
          // No toast - this is silent background operation
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])
  
  // Multi-tab sync
  useEffect(() => {
    const unsubscribe = sessionManager.current?.subscribe((session) => {
      queryClient.setQueryData(authKeys.session(), session)
    })
    
    return unsubscribe
  }, [queryClient])
  
  return {
    ...sessionQuery.data,
    isLoading: sessionQuery.isLoading,
    isRefetching: sessionQuery.isRefetching,
    error: sessionQuery.error,
    refetch: sessionQuery.refetch,
    isAuthenticated: !!(sessionQuery.data?.user && sessionQuery.data?.isInitialized),
    hasGym: !!sessionQuery.data?.profile?.gym_id,
  }
}

// Enhanced Logout with better UX
export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const sessionManager = useRef<MultiTabSessionManager | null>(null)
  
  if (!sessionManager.current) {
    sessionManager.current = MultiTabSessionManager.getInstance()
  }
  
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        throw error
      }
      
      return { success: true }
    },
    onMutate: async () => {
      // Optimistically update UI
      queryClient.setQueryData(authKeys.session(), {
        user: null,
        profile: null,
        isLoading: false,
        isInitialized: true
      })
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.all })
      
      try {
        sessionManager.current?.broadcast({
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true
        }, 'local')
      } catch (err) {
        console.warn('Error broadcasting logout session:', err)
      }
      
      toastActions.success('Signed Out', 'You have been signed out successfully.')
      router.push('/login')
    },
    onError: (error) => {
      console.error('Logout error:', error)
      
      // Force clear state even on error
      queryClient.removeQueries({ queryKey: authKeys.all })
      
      try {
        sessionManager.current?.broadcast({
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true
        }, 'local')
      } catch (err) {
        console.warn('Error broadcasting logout error session:', err)
      }
      
      toastActions.error('Sign Out Error', 'There was an issue signing out, but you have been logged out locally.')
      router.push('/login')
    },
  })
}

// Enhanced Profile Update with optimistic updates
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<Profile> }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return data as Profile
    },
    onMutate: async ({ userId, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: authKeys.profile(userId) })
      await queryClient.cancelQueries({ queryKey: authKeys.session() })
      
      // Snapshot previous values
      const previousProfile = queryClient.getQueryData(authKeys.profile(userId))
      const previousSession = queryClient.getQueryData(authKeys.session())
      
      // Optimistically update profile
      queryClient.setQueryData(authKeys.profile(userId), (old: Profile | undefined) => 
        old ? { ...old, ...updates } : undefined
      )
      
      // Optimistically update session
      queryClient.setQueryData(authKeys.session(), (old: AuthSession | undefined) => 
        old ? { ...old, profile: old.profile ? { ...old.profile, ...updates } : null } : undefined
      )
      
      return { previousProfile, previousSession }
    },
    onError: (err, variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousProfile) {
        queryClient.setQueryData(authKeys.profile(variables.userId), context.previousProfile)
      }
      if (context?.previousSession) {
        queryClient.setQueryData(authKeys.session(), context.previousSession)
      }
      
      toastActions.error('Update Failed', 'Failed to update profile. Please try again.')
    },
    onSuccess: (updatedProfile, { userId }) => {
      // Update caches with server response
      queryClient.setQueryData(authKeys.profile(userId), updatedProfile)
      queryClient.setQueryData(authKeys.session(), (old: AuthSession | undefined) => 
        old ? { ...old, profile: updatedProfile } : undefined
      )
      
      toastActions.success('Profile Updated', 'Your profile has been updated successfully.')
    },
    onSettled: (data, error, { userId }) => {
      // Invalidate to ensure server state is correct
      queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) })
      queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}

// Auth Guard Hook with better navigation handling
export function useAuthGuard(options: {
  requireAuth?: boolean
  requireGym?: boolean
  redirectTo?: string
} = {}) {
  const { requireAuth = true, requireGym = false, redirectTo = '/login' } = options
  const { isAuthenticated, hasGym, isLoading } = useAuthSession()
  const router = useRouter()
  
  const navigate = useCallback((path: string) => {
    router.replace(path)
  }, [router])
  
  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        navigate(redirectTo)
      } else if (requireGym && isAuthenticated && !hasGym) {
        navigate('/onboarding')
      }
    }
  }, [isAuthenticated, hasGym, isLoading, requireAuth, requireGym, redirectTo, navigate])
  
  return {
    isAuthenticated,
    hasGym,
    isLoading,
    canAccess: !isLoading && (!requireAuth || isAuthenticated) && (!requireGym || hasGym)
  }
}

// Initialize Auth hook
export function useInitializeAuth() {
  const { refetch } = useAuthSession()
  
  useEffect(() => {
    refetch()
  }, [refetch])
}

// Convenience hooks
export function useAuth() {
  return useAuthSession()
}

export function useAuthUser() {
  const { user } = useAuthSession()
  return user
}

export function useAuthProfile() {
  const { profile } = useAuthSession()
  return profile
} 