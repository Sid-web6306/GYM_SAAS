import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationResult,
} from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useCallback, useMemo, useRef } from 'react'
import { toastActions } from '@/stores/toast-store'
import type { User } from '@supabase/supabase-js'

// ========== ENHANCED TYPES ==========

export interface Profile {
  id: string
  full_name: string | null
  gym_id: string | null
  created_at: string
  updated_at?: string
  email?: string
  avatar_url?: string
  preferences?: Record<string, unknown>
}

export interface AuthSession {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  sessionId?: string
  lastRefresh?: number
}

export interface AuthError extends Error {
  code?: string
  status?: number
  details?: Record<string, unknown>
}

export interface AuthMetrics {
  sessionDuration: number
  refreshCount: number
  errorCount: number
  lastActivity: number
}

export interface AuthConfig {
  enableMultiTab: boolean
  enableMetrics: boolean
  enableAutoRefresh: boolean
  sessionTimeout: number
  maxRetries: number
  retryDelay: number
  staleTime: number
  gcTime: number
}

// ========== UTILITY FUNCTIONS ==========

// Replace lodash throttle with native implementation
function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null
  let lastExecTime = 0

  return ((...args: Parameters<T>) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func(...args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        func(...args)
        lastExecTime = Date.now()
      }, delay - (currentTime - lastExecTime))
    }
  }) as T
}

// Replace lodash debounce with native implementation
function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout | null = null

  return ((...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }) as T
}

// ========== ENHANCED QUERY KEYS ==========

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: (userId: string) => [...authKeys.all, 'profile', userId] as const,
  metrics: () => [...authKeys.all, 'metrics'] as const,
} as const

// ========== LOGOUT COORDINATION MANAGER ==========

class LogoutCoordinator {
  private static instance: LogoutCoordinator
  private isLoggingOut = false
  private logoutSource: 'manual' | 'auth_state' | 'multi_tab' | null = null
  private logoutPromise: Promise<void> | null = null

  static getInstance(): LogoutCoordinator {
    if (!LogoutCoordinator.instance) {
      LogoutCoordinator.instance = new LogoutCoordinator()
    }
    return LogoutCoordinator.instance
  }

  async executeLogout(
    source: 'manual' | 'auth_state' | 'multi_tab',
    logoutFn: () => Promise<void>
  ): Promise<boolean> {
    // If already logging out, wait for completion
    if (this.isLoggingOut) {
      console.log(
        `Logout (${source}): Already in progress (${this.logoutSource}), waiting...`
      )
      if (this.logoutPromise) {
        await this.logoutPromise
      }
      return false // Indicate this was a duplicate
    }

    console.log(`Logout (${source}): Starting logout process`)
    this.isLoggingOut = true
    this.logoutSource = source

    try {
      this.logoutPromise = logoutFn()
      await this.logoutPromise
      console.log(`Logout (${source}): Completed successfully`)
      return true
    } catch (error) {
      console.error(`Logout (${source}): Error during logout:`, error)
      throw error
    } finally {
      this.isLoggingOut = false
      this.logoutSource = null
      this.logoutPromise = null
    }
  }

  isInProgress(): boolean {
    return this.isLoggingOut
  }

  getSource(): string | null {
    return this.logoutSource
  }
}

// ========== ENHANCED MULTI-TAB MANAGER ==========

class EnhancedTabManager {
  private static instance: EnhancedTabManager
  private checkInterval: NodeJS.Timeout | null = null
  private lastAuthCheck: string | null = null
  private callbacks: Map<string, () => void> = new Map()
  private metrics: AuthMetrics = {
    sessionDuration: 0,
    refreshCount: 0,
    errorCount: 0,
    lastActivity: Date.now(),
  }
  private config: AuthConfig
  private isActive = false

  constructor(config: AuthConfig) {
    this.config = config
  }

  static getInstance(config?: AuthConfig): EnhancedTabManager {
    if (!EnhancedTabManager.instance) {
      EnhancedTabManager.instance = new EnhancedTabManager(
        config || {
          enableMultiTab: true,
          enableMetrics: true,
          enableAutoRefresh: true,
          sessionTimeout: 30 * 60 * 1000, // 30 minutes
          maxRetries: 3,
          retryDelay: 1000,
          staleTime: 30 * 1000, // 30 seconds
          gcTime: 5 * 60 * 1000, // 5 minutes
        }
      )
    }
    return EnhancedTabManager.instance
  }

  startMonitoring(id: string, onLogoutDetected: () => void) {
    if (!this.config.enableMultiTab) return

    this.callbacks.set(id, onLogoutDetected)

    if (this.checkInterval) return // Already monitoring

    this.isActive = true
    this.metrics.lastActivity = Date.now()

    // Enhanced cookie monitoring with throttling
    const checkAuthState = throttle(() => {
      if (!this.isActive || typeof window === 'undefined') return

      try {
        const hasAuthCookies =
          document.cookie.includes('supabase') || document.cookie.includes('sb-')

        const currentStatus = hasAuthCookies ? 'authenticated' : 'logged_out'

        if (
          this.lastAuthCheck === 'authenticated' &&
          currentStatus === 'logged_out'
        ) {
          console.log('EnhancedTabManager: Multi-tab logout detected')
          this.metrics.errorCount++
          this.triggerLogout()
        }

        this.lastAuthCheck = currentStatus
        this.metrics.lastActivity = Date.now()
      } catch (error) {
        console.error('EnhancedTabManager: Error in auth monitoring:', error)
        this.metrics.errorCount++
      }
    }, 1000) // Throttle to prevent excessive calls

    this.checkInterval = setInterval(checkAuthState, 2000)

    // Add visibility change listener for better performance
    const handleVisibilityChange = () => {
      if (document.hidden) {
        this.pauseMonitoring()
      } else {
        this.resumeMonitoring()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    console.log('EnhancedTabManager: Started monitoring with enhanced features')
  }

  private pauseMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private resumeMonitoring() {
    if (!this.checkInterval && this.isActive) {
      // Restart monitoring when tab becomes visible
      this.startMonitoring('resume', () => {})
    }
  }

  private triggerLogout() {
    this.callbacks.forEach((callback, id) => {
      try {
        callback()
      } catch (error) {
        console.error(
          `EnhancedTabManager: Error in logout callback for ${id}:`,
          error
        )
      }
    })
  }

  stopMonitoring(id?: string) {
    if (id) {
      this.callbacks.delete(id)
    }

    if (this.callbacks.size === 0) {
      this.isActive = false
      if (this.checkInterval) {
        clearInterval(this.checkInterval)
        this.checkInterval = null
      }
      this.lastAuthCheck = null
      console.log('EnhancedTabManager: Stopped monitoring')
    }
  }

  getMetrics(): AuthMetrics {
    return { ...this.metrics }
  }

  updateMetrics(updates: Partial<AuthMetrics>) {
    this.metrics = { ...this.metrics, ...updates }
  }

  destroy() {
    this.isActive = false
    this.callbacks.clear()
    this.stopMonitoring()
    document.removeEventListener('visibilitychange', this.resumeMonitoring)
  }
}

// ========== ENHANCED ERROR HANDLING ==========

export class AuthErrorHandler {
  private static retryDelays = [1000, 2000, 4000, 8000]

  static createAuthError(error: unknown, context: string): AuthError {
    const errorObj = error as Error
    const authError = new Error(
      errorObj?.message || 'Authentication error'
    ) as AuthError
    authError.code = (error as { code?: string })?.code || 'UNKNOWN_ERROR'
    authError.status = (error as { status?: number })?.status || 500
    authError.details = { context, originalError: error }
    authError.name = 'AuthError'
    return authError
  }

  static shouldRetry(error: unknown, attemptNumber: number): boolean {
    if (attemptNumber >= 3) return false

    const errorObj = error as {
      code?: string
      message?: string
      status?: number
    }

    // Don't retry on specific auth errors
    if (
      errorObj?.code?.includes('JWT') ||
      errorObj?.code?.includes('session') ||
      errorObj?.message?.includes('Invalid login') ||
      errorObj?.status === 401
    ) {
      return false
    }

    // Don't retry on network errors after 3 attempts
    if (errorObj?.code === 'NETWORK_ERROR' && attemptNumber >= 2) {
      return false
    }

    return true
  }

  static getRetryDelay(attemptNumber: number): number {
    return AuthErrorHandler.retryDelays[
      Math.min(attemptNumber, AuthErrorHandler.retryDelays.length - 1)
    ]
  }

  static handleAuthError(error: unknown, context: string) {
    const authError = AuthErrorHandler.createAuthError(error, context)

    // Log error with context
    console.error(`AuthError in ${context}:`, {
      error: authError,
      code: authError.code,
      details: authError.details,
      timestamp: new Date().toISOString(),
    })

    // Report to monitoring service (if available)
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (
        window as unknown as {
          gtag: (
            event: string,
            action: string,
            params: Record<string, unknown>
          ) => void
        }
      ).gtag
      gtag('event', 'auth_error', {
        error_code: authError.code,
        error_context: context,
        error_message: authError.message,
      })
    }

    return authError
  }
}

// ========== PERFORMANCE OPTIMIZATIONS ==========

// Memoized query function
const createAuthQueryFn = (config: AuthConfig) => {
  return async (): Promise<AuthSession> => {
    const supabase = createClient()
    const startTime = Date.now()

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) {
        throw AuthErrorHandler.createAuthError(error, 'session_fetch')
      }

      const user = session?.user || null

      if (!user) {
        return {
          user: null,
          profile: null,
          isLoading: false,
          isInitialized: true,
          sessionId: undefined,
          lastRefresh: Date.now(),
        }
      }

      // Parallel profile fetch for better performance
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: profile, error: profileError } = await profilePromise

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch warning:', profileError)
      }

      const sessionData: AuthSession = {
        user,
        profile: profile || null,
        isLoading: false,
        isInitialized: true,
        sessionId: session?.access_token?.slice(-10) || undefined,
        lastRefresh: Date.now(),
      }

      // Update metrics
      const tabManager = EnhancedTabManager.getInstance(config)
      tabManager.updateMetrics({
        refreshCount: tabManager.getMetrics().refreshCount + 1,
        lastActivity: Date.now(),
      })

      const duration = Date.now() - startTime
      if (duration > 1000) {
        console.warn(`Auth query took ${duration}ms - consider optimization`)
      }

      return sessionData
    } catch (error) {
      throw AuthErrorHandler.handleAuthError(error, 'auth_query')
    }
  }
}

// ========== ENHANCED CORE AUTH HOOK ==========

export const useAuth = (customConfig?: Partial<AuthConfig>) => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const hookId = useRef(`auth-${Math.random().toString(36).substr(2, 9)}`)

  // Merge config with defaults
  const config = useMemo(
    (): AuthConfig => ({
      enableMultiTab: true,
      enableMetrics: true,
      enableAutoRefresh: true,
      sessionTimeout: 30 * 60 * 1000,
      maxRetries: 3,
      retryDelay: 1000,
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      ...customConfig,
    }),
    [customConfig]
  )

  const tabManager = useMemo(
    () => EnhancedTabManager.getInstance(config),
    [config]
  )

  // Memoized query function
  const queryFn = useMemo(() => createAuthQueryFn(config), [config])

  // Enhanced auth session query
  const authQuery = useQuery({
    queryKey: authKeys.session(),
    queryFn,
    retry: (failureCount, error) =>
      AuthErrorHandler.shouldRetry(error, failureCount),
    retryDelay: attemptIndex => AuthErrorHandler.getRetryDelay(attemptIndex),
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: config.staleTime,
    gcTime: config.gcTime,
    meta: {
      errorMessage: 'Failed to fetch authentication session',
    },
  })

  // Memoized derived values for performance
  const derivedValues = useMemo(() => {
    const user = authQuery.data?.user || null
    const profile = authQuery.data?.profile || null
    const isAuthenticated = !!user
    const hasGym = !!profile?.gym_id
    const sessionId = authQuery.data?.sessionId
    const lastRefresh = authQuery.data?.lastRefresh

    return {
      user,
      profile,
      isAuthenticated,
      hasGym,
      sessionId,
      lastRefresh,
      isLoading: authQuery.isLoading,
      isInitialized: authQuery.data?.isInitialized || false,
      error: authQuery.error,
      refetch: authQuery.refetch,
    }
  }, [authQuery])

  // Enhanced auth state change handler with improved error recovery
  const handleAuthStateChange = useCallback(
    debounce((event: string, session: { user?: User } | null) => {
      console.log('Auth state change:', event, session?.user?.email || 'no user');
    
      if (event === 'SIGNED_OUT') {
        const coordinator = LogoutCoordinator.getInstance();
        coordinator.executeLogout('auth_state', async () => {
          await performLogoutCleanup(queryClient, router, 'auth_state');
        }).catch(error => {
          console.error('Auth state change: Coordinated logout failed:', error);
          router.push('/login');
        });
        return;
      }
    
      if (event === 'SIGNED_IN') {
        queryClient.invalidateQueries({ queryKey: authKeys.session() });
        console.log('Auth state change: SIGNED_IN - refreshing auth data');
      }
    
      if (event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: authKeys.session() });
        console.log('Auth state change: TOKEN_REFRESHED - session invalidated');
      }
    }, 300),
    [queryClient, router]
  );

  // Enhanced auth state subscription
  useEffect(() => {
    if (typeof window === 'undefined') return

    const supabase = createClient()
    let lastEventTime = 0

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const now = Date.now()

      // Enhanced deduplication
      if (now - lastEventTime < 500) {
        return
      }
      lastEventTime = now

      handleAuthStateChange(event, session)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [handleAuthStateChange])

  // Enhanced multi-tab monitoring with comprehensive cleanup
  useEffect(() => {
    if (!config.enableMultiTab || typeof window === 'undefined') return

    const handleLogoutDetected = () => {
      console.log('Multi-tab logout detected - using coordinated cleanup')

      const coordinator = LogoutCoordinator.getInstance()

      coordinator
        .executeLogout('multi_tab', async () => {
          await performLogoutCleanup(queryClient, router, 'multi_tab')
        })
        .catch(error => {
          console.error('Multi-tab logout: Coordinated logout failed:', error)
          // Fallback: still redirect to login
          router.push('/login')
        })
    }

    const currentHookId = hookId.current
    tabManager.startMonitoring(currentHookId, handleLogoutDetected)

    return () => {
      tabManager.stopMonitoring(currentHookId)
    }
  }, [config.enableMultiTab, queryClient, router, tabManager])

  // Session timeout monitoring
  useEffect(() => {
    if (!config.enableAutoRefresh || !derivedValues.isAuthenticated) return

    const timeoutId = setTimeout(() => {
      console.log('Session timeout - refreshing auth')
      authQuery.refetch()
    }, config.sessionTimeout)

    return () => clearTimeout(timeoutId)
  }, [
    config.enableAutoRefresh,
    config.sessionTimeout,
    derivedValues.isAuthenticated,
    authQuery,
  ])

  // Performance monitoring
  useEffect(() => {
    if (!config.enableMetrics) return

    const metrics = tabManager.getMetrics()

    // Log performance metrics periodically
    const metricsInterval = setInterval(() => {
      const currentMetrics = tabManager.getMetrics()
      if (currentMetrics.errorCount > metrics.errorCount) {
        console.warn('Auth errors detected:', currentMetrics)
      }
    }, 60000) // Every minute

    return () => clearInterval(metricsInterval)
  }, [config.enableMetrics, tabManager])

  return derivedValues
}

// ========== SHARED LOGOUT CLEANUP ==========

// Get environment-specific prefix for cleanup
const getEnvironmentPrefix = () => {
  // Check NODE_ENV first (most reliable)
  if (process.env.NODE_ENV === 'development') return 'dev'
  if (process.env.NODE_ENV === 'test') return 'test'

  // Check for explicit environment variable
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV
  if (explicitEnv) {
    if (explicitEnv === 'development') return 'dev'
    if (explicitEnv === 'staging') return 'staging'
    if (explicitEnv === 'production') return 'prod'
  }

  // Fallback to URL detection
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (url?.includes('dev') || url?.includes('localhost')) return 'dev'
  if (url?.includes('staging')) return 'staging'

  // Default to prod for production builds
  return process.env.NODE_ENV === 'production' ? 'prod' : 'dev'
}

const performLogoutCleanup = async (
  queryClient: ReturnType<typeof useQueryClient>,
  router: ReturnType<typeof useRouter>,
  source: 'manual' | 'auth_state' | 'multi_tab'
): Promise<void> => {
  try {
    // Clear auth session data
    queryClient.setQueryData(authKeys.session(), {
      user: null,
      profile: null,
      isLoading: false,
      isInitialized: true,
      sessionId: undefined,
      lastRefresh: Date.now(),
    })

    // More targeted query removal instead of clearing the whole cache
    queryClient.removeQueries({ queryKey: authKeys.all })
    queryClient.removeQueries({ queryKey: ['gym'] })
    queryClient.removeQueries({ queryKey: ['members'] })

    // Clear environment-specific client storage
    if (typeof window !== 'undefined') {
      const envPrefix = getEnvironmentPrefix()

      // Clear environment-specific storage
      localStorage.removeItem(`${envPrefix}-auth-ui-store`)
      localStorage.removeItem(`${envPrefix}-supabase.auth.token`)

      // Clear environment-specific cookies
      const cookies = document.cookie.split(';')
      cookies.forEach(cookie => {
        const [name] = cookie.split('=')
        if (name.trim().startsWith(`${envPrefix}-`)) {
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      })

      console.log(
        `Logout cleanup (${source}): Environment-specific cleanup complete for ${envPrefix}`
      )
    }

    // Show success message only for manual logout
    if (source === 'manual') {
      toastActions.success('Signed Out', 'You have been signed out successfully.')
    }

    // Redirect to login
    router.push('/login')

    console.log(`Logout cleanup (${source}): Complete`)
  } catch (error) {
    console.error(`Logout cleanup (${source}): Error:`, error)
    // Always redirect even if cleanup fails
    router.push('/login')
  }
}

// ========== ENHANCED MUTATIONS ==========

export const useUpdateProfile = (): UseMutationResult<
  Profile,
  AuthError,
  Partial<Profile>
> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw AuthErrorHandler.createAuthError(userError, 'profile_update_auth')
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw AuthErrorHandler.createAuthError(error, 'profile_update')
      }

      return data as Profile
    },
    onMutate: async updates => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: authKeys.session() })

      const previousAuth = queryClient.getQueryData(authKeys.session())

      queryClient.setQueryData(
        authKeys.session(),
        (old: AuthSession | undefined) => {
          if (!old) return old
          return {
            ...old,
            profile: old.profile ? { ...old.profile, ...updates } : null,
          }
        }
      )

      return { previousAuth }
    },
    onError: (error, _updates, context) => {
      // Rollback optimistic update
      if (context?.previousAuth) {
        queryClient.setQueryData(authKeys.session(), context.previousAuth)
      }

      console.error('Profile update error:', error)
      toastActions.error(
        'Update Failed',
        'Failed to update profile. Please try again.'
      )
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: authKeys.session() })
      toastActions.success(
        'Profile Updated',
        'Your profile has been updated successfully.'
      )
    },
    onSettled: () => {
      // Ensure data is fresh
      queryClient.invalidateQueries({ queryKey: authKeys.session() })
    },
  })
}

export const useLogout = (): UseMutationResult<
  { success: boolean; error?: string },
  AuthError,
  void
> => {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      const coordinator = LogoutCoordinator.getInstance()

      // Execute coordinated logout
      const wasExecuted = await coordinator.executeLogout('manual', async () => {
        // Let server handle the heavy lifting
        const { logout } = await import('@/actions/auth.actions')
        const result = await logout()

        if (!result.success) {
          throw AuthErrorHandler.createAuthError(
            new Error(result.error || 'Server logout failed'),
            'server_logout'
          )
        }

        // Perform cleanup
        await performLogoutCleanup(queryClient, router, 'manual')
      })

      if (!wasExecuted) {
        // This was a duplicate logout request
        return { success: true, message: 'Logout already in progress' }
      }

      return { success: true }
    },
    retry: (failureCount, error) => {
      // Only retry network errors, not auth errors
      if (failureCount >= 2) return false

      const errorMessage = error?.message || ''
      if (errorMessage.includes('Server logout failed')) {
        return false // Don't retry server-side failures
      }

      return true // Retry network errors
    },
    meta: {
      errorMessage: 'Failed to logout',
    },
  })
}

// ========== ENHANCED UTILITY HOOKS ==========

export function useAuthGuard(
  options: {
    requireAuth?: boolean
    requireGym?: boolean
    redirectTo?: string
  } = {}
) {
  const { requireAuth = true, requireGym = false, redirectTo = '/login' } =
    options
  const { isAuthenticated, hasGym, isLoading } = useAuth()
  const router = useRouter()

  const navigate = useCallback(
    (path: string) => {
      router.replace(path)
    },
    [router]
  )

  useEffect(() => {
    if (!isLoading) {
      if (requireAuth && !isAuthenticated) {
        navigate(redirectTo)
      } else if (requireGym && isAuthenticated && !hasGym) {
        navigate('/onboarding')
      }
    }
  }, [
    isAuthenticated,
    hasGym,
    isLoading,
    requireAuth,
    requireGym,
    redirectTo,
    navigate,
  ])

  return {
    isAuthenticated,
    hasGym,
    isLoading,
    canAccess:
      !isLoading &&
      (!requireAuth || isAuthenticated) &&
      (!requireGym || hasGym),
  }
}

export function useInitializeAuth() {
  const { refetch } = useAuth()

  useEffect(() => {
    refetch()
  }, [refetch])
}

export function usePostOnboardingSync() {
  const { refetch } = useAuth()
  const queryClient = useQueryClient()

  return useCallback(async () => {
    console.log('Post-onboarding sync: Clearing auth cache and refetching')

    queryClient.removeQueries({ queryKey: authKeys.all })

    // Force refetch with fresh data and return the promise
    const result = await refetch()

    queryClient.removeQueries({ queryKey: ['gym'] })
    queryClient.removeQueries({ queryKey: ['members'] })

    return result
  }, [refetch, queryClient])
}

// ========== ENHANCED CONVENIENCE HOOKS ==========

export function useAuthUser() {
  const { user } = useAuth()
  return user
}

export function useAuthProfile() {
  const { profile } = useAuth()
  return profile
}

export function useAuthMetrics() {
  const tabManager = EnhancedTabManager.getInstance()
  return tabManager.getMetrics()
}

export function useAuthSession() {
  const { user, sessionId, lastRefresh } = useAuth()
  return { user, sessionId, lastRefresh }
}

// ========== CLEANUP ==========

// Global cleanup function
export const cleanupAuth = () => {
  const tabManager = EnhancedTabManager.getInstance()
  tabManager.destroy()
} 