import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

// Types for better type safety
interface UserProfile {
  gym_id: string | null
  id: string | null
  user_roles?: Array<{
    role_id: string
    is_active: boolean
    roles: { name: string } | null
  }> | null
}

interface CacheEntry {
  response: NextResponse
  timestamp: number
  userState?: {
    isAuthenticated: boolean
    hasGym: boolean
    role: string | null
    isInactive: boolean
  }
}

// Configuration constants
const CONFIG = {
  CACHE_TTL: 30000, // 30 seconds
  COOKIE_MAX_AGE: 10, // 10 seconds for temporary cookies
  TOAST_MAX_AGE: 5, // 5 seconds for toast messages
} as const

// Route definitions - centralized for easier maintenance
const ROUTES = {
  AUTH: ['/login', '/signup', '/verify-email', '/confirm-email', '/verify-phone'],
  APP: ['/dashboard', '/members', '/staff', '/attendance', '/settings', '/team', '/upgrade'],
  PUBLIC: ['/', '/contact', '/privacy-policy', '/terms-of-service', '/refund-policy'],
  PORTAL: ['/portal'],
  INVITE: ['/invite', '/accept-invitation'],
  SPECIAL: ['/inactive-user'],
  STATIC_PATTERNS: [
    /^\/_next/,
    /^\/api/,
    /^\/auth\/callback/,
    /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot|sw\.js|manifest\.json|browserconfig\.xml|robots\.txt)$/
  ]
} as const

// Request cache with Map for better performance
const requestCache = new Map<string, CacheEntry>()

// Optimized environment detection
const getEnvironmentPrefix = (): string => {
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) return 'dev'
  if (explicitEnv === 'staging') return 'staging'
  return 'prod' // Default for production
}

// Optimized static file detection with caching
const staticFileCache = new Map<string, boolean>()
const isStaticFile = (pathname: string): boolean => {
  if (staticFileCache.has(pathname)) {
    return staticFileCache.get(pathname)!
  }
  
  const isStatic = ROUTES.STATIC_PATTERNS.some(pattern => 
    pattern instanceof RegExp ? pattern.test(pathname) : pathname.startsWith(pattern as string)
  )
  
  staticFileCache.set(pathname, isStatic)
  return isStatic
}

// Route type checking utilities
const createRouteChecker = (routes: readonly string[]) => 
  (pathname: string) => routes.some(route => pathname.startsWith(route))

const isAuthRoute = createRouteChecker(ROUTES.AUTH)
const isAppRoute = createRouteChecker(ROUTES.APP)
const isPortalRoute = createRouteChecker(ROUTES.PORTAL)
const isInviteRoute = createRouteChecker(ROUTES.INVITE)
const isSpecialRoute = createRouteChecker(ROUTES.SPECIAL)

// Optimized user profile fetching with better error handling
const fetchUserProfile = async (supabase: SupabaseClient, userId: string): Promise<{
  hasGym: boolean
  userRole: string | null
  isInactive: boolean
  profileData: UserProfile | null
}> => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        gym_id,
        user_roles!left(
          role_id,
          is_active,
          roles(name)
        )
      `)
      .eq('id', userId)
      .single()

    if (error) {
      logger.error('Profile fetch error:', { message: error.message, code: error.code })
      return { hasGym: false, userRole: null, isInactive: false, profileData: null }
    }

    const hasGymId = Boolean(profile?.gym_id)
    let userRole: string | null = null
    let hasActiveRole = false

    // Find active role
    if (hasGymId && profile?.user_roles && Array.isArray(profile.user_roles)) {
      const activeRoleEntry = profile.user_roles.find(
        (role: { is_active: boolean; roles: unknown }) => {
          const roleData = Array.isArray(role.roles) ? role.roles[0] : role.roles
          return role.is_active === true && roleData?.name
        }
      )
      
      if (activeRoleEntry) {
        const roleData = Array.isArray(activeRoleEntry.roles) ? activeRoleEntry.roles[0] : activeRoleEntry.roles
        if (roleData?.name) {
          userRole = roleData.name
          hasActiveRole = true
        }
      }
    }

    // User has a gym if they have a gym_id AND an active role
    const hasGym = hasGymId && hasActiveRole
    const isInactive = hasGymId && !hasActiveRole

    return { hasGym, userRole, isInactive, profileData: profile as unknown as UserProfile }
  } catch (error) {
    logger.error('Profile fetch exception:', {error})
    return { hasGym: false, userRole: null, isInactive: false, profileData: null }
  }
}

// Subscription access check with caching
const checkSubscriptionAccess = async (supabase: SupabaseClient, userId: string): Promise<boolean> => {
  try {
    const { data: hasAccess, error } = await supabase.rpc('check_subscription_access', {
      p_user_id: userId
    })

    if (error) {
      logger.warn('Subscription check error - failing open:', {error})
      return true // Fail open on error
    }

    return Boolean(hasAccess)
  } catch (error) {
    logger.warn('Subscription check exception - failing open:', {error})
    return true // Fail open on error
  }
}

// Create redirect response with invite token preservation
const createRedirect = (url: string, request: NextRequest, inviteToken?: string): NextResponse => {
  const redirectUrl = new URL(url, request.url)
  
  if (inviteToken) {
    redirectUrl.searchParams.set('invite', inviteToken)
  }
  
  return NextResponse.redirect(redirectUrl)
}

// Set toast message cookie
const setToastCookie = (response: NextResponse, message: string): void => {
  response.cookies.set('toast_message', message, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CONFIG.TOAST_MAX_AGE
  })
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isDev = process.env.NODE_ENV === 'development'
  
  // Early return for static files
  if (isStaticFile(pathname)) {
    return NextResponse.next()
  }

  // Extract invitation token
  const inviteToken = request.nextUrl.searchParams.get('invite')
  const hasInviteToken = Boolean(inviteToken)

  // Create cache key
  const authHeader = request.headers.get('authorization')
  const cacheKey = `${pathname}-${authHeader || 'no-auth'}-${inviteToken || 'no-invite'}`

  // Check cache first
  const cachedEntry = requestCache.get(cacheKey)
  if (cachedEntry && Date.now() - cachedEntry.timestamp < CONFIG.CACHE_TTL) {
    return cachedEntry.response
  }

  // Clean expired cache entries periodically
  if (requestCache.size > 100) {
    const now = Date.now()
    for (const [key, entry] of requestCache.entries()) {
      if (now - entry.timestamp >= CONFIG.CACHE_TTL) {
        requestCache.delete(key)
      }
    }
  }

  // Reduced logging for development
  if (isDev && !pathname.startsWith('/_next')) {
    logger.info('🔧 MIDDLEWARE:', { pathname })
  }

  try {
    // Create response for cookie handling
    let response = NextResponse.next({
      request: { headers: request.headers }
    })

    // Create Supabase client with environment-specific cookies
    const envPrefix = getEnvironmentPrefix()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            const envName = `${envPrefix}-${name}`
            return request.cookies.get(envName)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            const envName = `${envPrefix}-${name}`
            request.cookies.set({ name: envName, value, ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name: envName, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            const envName = `${envPrefix}-${name}`
            request.cookies.set({ name: envName, value: '', ...options })
            response = NextResponse.next({ request: { headers: request.headers } })
            response.cookies.set({ name: envName, value: '', ...options })
          },
        },
      }
    )

    // Get user authentication status
    const { data: { user }, error } = await supabase.auth.getUser()
    const isAuthenticated = !error && Boolean(user)

    // Route type checks
    const isPublicRoute = (ROUTES.PUBLIC as readonly string[]).includes(pathname)
    const isOnboardingRoute = pathname.startsWith('/onboarding')

    // Handle unauthenticated users
    if (!isAuthenticated) {
      // Allow access to auth routes and public pages
      if (isAuthRoute(pathname) || isPublicRoute) {
        return response
      }
      
      // Allow onboarding with invitation token
      if (isOnboardingRoute && hasInviteToken) {
        if (isDev) logger.info('🔧 Allowing unauthenticated onboarding with invite')
        return response
      }
      
      // Allow invite routes
      if (isInviteRoute(pathname)) {
        if (isDev) logger.info('🔧 Allowing access to invite route')
        return response
      }
      
      // Redirect to login with invite token preservation
      if (isDev) {
        logger.info(`🔧 Redirecting unauthenticated user to login${hasInviteToken ? ' with invite' : ''}`)
      }
      return createRedirect('/login', request, inviteToken || undefined)
    }

    // Handle authenticated users
    if (!user) {
      // This shouldn't happen, but handle gracefully
      return createRedirect('/login', request, inviteToken || undefined)
    }

    // Fetch user profile and role information
    const { hasGym, userRole, isInactive, profileData } = await fetchUserProfile(supabase, user.id)

    // Cache user state for potential reuse
    const userState = { isAuthenticated, hasGym, role: userRole, isInactive }

    // Redirect authenticated users away from auth routes
    if (isAuthRoute(pathname)) {
      let redirectPath = hasGym ? '/dashboard' : '/onboarding'
      
      // Redirect members to portal instead of dashboard
      if (hasGym && userRole === 'member') {
        redirectPath = '/portal'
      }
      
      return createRedirect(redirectPath, request, inviteToken || undefined)
    }

    // Handle inactive users (has gym but no active role)
    if (isInactive && !isSpecialRoute(pathname) && !isPublicRoute && !isOnboardingRoute) {
      return createRedirect('/inactive-user', request, inviteToken || undefined)
    }

    // Handle onboarding flow
    if (isOnboardingRoute) {
      // Always allow with invite token (for invitation acceptance)
      if (hasInviteToken) {
        return response
      }
      
      // Redirect to dashboard if already has gym
      if (hasGym) {
        return createRedirect('/dashboard', request)
      }
      
      return response
    }

    // Handle app routes
    if (isAppRoute(pathname)) {
      // Redirect to onboarding if no gym
      if (!hasGym) {
        return createRedirect('/onboarding', request, inviteToken || undefined)
      }
      
      // Allow dashboard access with invite token (for multi-gym invitations)
      if (hasInviteToken) {
        return response
      }
      
      // Redirect members to portal
      if (userRole === 'member') {
        return createRedirect('/portal', request)
      }

      // ✅ Check subscription access for protected routes (includes trial expiry check)
      if (profileData?.id && !pathname.startsWith('/upgrade') && !pathname.startsWith('/settings')) {
        const hasAccess = await checkSubscriptionAccess(supabase, profileData.id)
        
        if (!hasAccess) {
          logger.warn('⚠️ Subscription access denied - redirecting to upgrade', { 
            gymId: profileData.gym_id, 
            pathname,
            hasAccess
          })
          
          const redirectResponse = createRedirect('/upgrade', request)
          
          // Set cookie to indicate why they're being redirected
          redirectResponse.cookies.set('subscription_redirect_reason', 'trial_expired', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: CONFIG.COOKIE_MAX_AGE
          })
          
          setToastCookie(redirectResponse, 'trial_expired')
          
          return redirectResponse
        }
      }
      
      return response
    }

    // Handle portal routes (member-specific)
    if (isPortalRoute(pathname)) {
      if (!profileData?.gym_id) {
        const dashboardResponse = createRedirect('/dashboard', request)
        setToastCookie(dashboardResponse, 'no_gym')
        return dashboardResponse
      }
      
      // Only members can access portal
      if (userRole === 'member') {
        return response
      }
      
      // Redirect non-members with toast message
      const dashboardResponse = createRedirect('/dashboard', request)
      setToastCookie(dashboardResponse, 'portal_access_denied')
      return dashboardResponse
    }

    // Allow invite routes
    if (isInviteRoute(pathname)) {
      return response
    }

    // Handle root path redirect
    if (pathname === '/') {
      const redirectPath = hasGym ? '/dashboard' : '/onboarding'
      return createRedirect(redirectPath, request, inviteToken || undefined)
    }

    // Cache successful response
    requestCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      userState
    })
    
    return response

  } catch (error) {
    logger.error('Middleware error - failing open:',  { error })
    // Fail open on any unexpected error
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - Static files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot|sw\\.js|manifest\\.json|browserconfig\\.xml|robots\\.txt)$).*)',
  ],
}
