import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { logger } from '@/lib/logger'

// Edge Runtime-compatible environment detection
const getEnvironmentPrefix = (): string => {
  // Use NEXT_PUBLIC variables which are available at build time
  const explicitEnv = process.env.NEXT_PUBLIC_APP_ENV
  const isDev = process.env.NODE_ENV === 'development'
  
  // Simple environment detection for Edge Runtime
  if (isDev) return 'dev'
  if (explicitEnv === 'staging') return 'staging'
  if (explicitEnv === 'production') return 'prod'
  
  // Default based on NODE_ENV only
  return 'prod'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Debug: Log all middleware requests (Edge Runtime compatible)
  if (process.env.NODE_ENV === 'development') {
    logger.info('🔧 MIDDLEWARE: Processing request to:', { pathname })
  }
  
  // Skip middleware for static files, API routes, and auth callback
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback') ||
    pathname.includes('.') // Static files (images, favicon, etc.)
  ) {
    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 MIDDLEWARE: Skipping static/API route:', { pathname })
    }
    return NextResponse.next()
  }

  try {
    // Create response for cookie handling
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Get environment prefix (same as server client)
    const envPrefix = getEnvironmentPrefix()
    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 MIDDLEWARE: Using environment prefix:', { envPrefix })
    }

    // Create Supabase client with SAME cookie naming as server
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            // Use environment-specific cookie names (SAME as server.ts)
            const envName = `${envPrefix}-${name}`
            const value = request.cookies.get(envName)?.value
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: Getting cookie:', { originalName: name, envName, hasValue: !!value })
            }
            return value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: Setting cookie:', { originalName: name, envName })
            }
            request.cookies.set({
              name: envName,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name: envName,
              value,
              ...options,
            })
          },
          remove(name: string, options: Record<string, unknown>) {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: Removing cookie:', { originalName: name, envName })
            }
            request.cookies.set({
              name: envName,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name: envName,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.getSession()

    if (process.env.NODE_ENV === 'development') {
      logger.info('🔧 MIDDLEWARE: Auth check result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        error: error?.message,
        pathname 
      })
    }

    // If there's an auth error, treat as unauthenticated (fail-safe)
    const isAuthenticated = !error && !!session?.user
    const user = session?.user

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        logger.warn('🔧 MIDDLEWARE: Auth error, treating as unauthenticated:', { error: error.message })
      }
    }

    // Define route types with invitation support
    const authRoutes = ['/login', '/signup', '/verify-email', '/confirm-email']
    const appRoutes = ['/dashboard', '/members', '/staff', '/attendance', '/settings', '/team', '/upgrade']
    const publicRoutes = ['/', '/contact', '/privacy-policy', '/terms-of-service', '/refund-policy']
    const portalRoutes = ['/portal'] // Member portal routes
    const inviteRoutes = ['/invite', '/accept-invitation'] // Future-proof for dedicated invite pages
    
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isAppRoute = appRoutes.some(route => pathname.startsWith(route))
    const isPortalRoute = portalRoutes.some(route => pathname.startsWith(route))
    const isOnboardingRoute = pathname.startsWith('/onboarding')
    const isInviteRoute = inviteRoutes.some(route => pathname.startsWith(route))
    const isPublicRoute = publicRoutes.includes(pathname)
    
    // Extract invitation token from URL
    const inviteToken = request.nextUrl.searchParams.get('invite')
    const hasInviteToken = !!inviteToken

    // Handle unauthenticated users
    if (!isAuthenticated) {
      // Allow access to auth routes and public pages
      if (isAuthRoute || isPublicRoute) {
        return response
      }
      
      // Allow access to onboarding with invitation token (invitation acceptance flow)
      if (isOnboardingRoute && hasInviteToken) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Allowing unauthenticated access to onboarding with invite token')
        }
        return response
      }
      
      // Allow access to future dedicated invite routes
      if (isInviteRoute) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Allowing access to invite route')
        }
        return response
      }
      
      // Redirect to login for protected routes, preserve invite token
      const loginUrl = new URL('/login', request.url)
              if (hasInviteToken) {
          loginUrl.searchParams.set('invite', inviteToken)
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting unauthenticated user to login with invite token')
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting unauthenticated user to login')
          }
        }
      return NextResponse.redirect(loginUrl)
    }

    // Handle authenticated users
    if (isAuthenticated && user) {
      // Check if user has completed onboarding (has gym setup) and get role info
      let hasGym = false
      let userRoleData: { roles: { name: string }[] } | null = null
      let userProfileData: { gym_id: string } | null = null
      
      try {
        // Single query to get both profile and role information
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .single()
        
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Profile fetch result:', {
            profile,
            profileError: profileError?.message,
            hasGymId: !!(profile?.gym_id),
            userId: user.id
          })
        }
        
        hasGym = !!(profile?.gym_id)
        userProfileData = profile
        
        // If user has gym, also fetch their role information
        if (hasGym && profile?.gym_id) {
          const { data: userRole, error: roleError } = await supabase
            .from('user_roles')
            .select(`
              role_id,
              roles(name)
            `)
            .eq('user_id', user.id)
            .eq('gym_id', profile.gym_id)
            .eq('is_active', true)
            .single()
          
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Role fetch result:', {
              userRole,
              roleError: roleError?.message,
              gymId: profile.gym_id
            })
          }
          
          userRoleData = userRole
        }
      } catch (error) {
        // If profile fetch fails, treat as no gym (fail-safe)
        if (process.env.NODE_ENV === 'development') {
          logger.warn('🔧 MIDDLEWARE: Profile/Role fetch failed, treating as no gym:', { error })
        }
        hasGym = false
      }

      // Redirect authenticated users away from auth routes
      if (isAuthRoute) {
        // Preserve invite token in redirects
        const redirectUrl = hasGym ? '/dashboard' : '/onboarding'
        const redirectUrlObj = new URL(redirectUrl, request.url)
        
        if (hasInviteToken) {
          redirectUrlObj.searchParams.set('invite', inviteToken)
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting authenticated user from auth route with invite token to:', { redirectUrl })
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting authenticated user from auth route to:', { redirectUrl })
          }
        }
        return NextResponse.redirect(redirectUrlObj)
      }

      // Handle onboarding flow
      if (isOnboardingRoute) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Onboarding route check:', { hasGym, hasInviteToken, shouldRedirect: hasGym && !hasInviteToken })
        }
        
        // If user already has gym but has an invite token, allow onboarding for invitation acceptance
        if (hasGym && hasInviteToken) {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Allowing onboarding access for user with gym (has invite token)')
          }
          return response
        }
        
        // If user already has gym and no invite token, redirect to dashboard
        if (hasGym && !hasInviteToken) {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting /onboarding → /dashboard (user has gym, no invite)')
          }
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        
        // Allow access to onboarding for users without gym
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Allowing access to onboarding')
        }
        return response
      }

      // Handle app routes
      if (isAppRoute) {
        // If user doesn't have gym, redirect to onboarding (preserve invite token)
        if (!hasGym) {
          const onboardingUrl = new URL('/onboarding', request.url)
          if (hasInviteToken) {
            onboardingUrl.searchParams.set('invite', inviteToken)
          }
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Redirecting to onboarding (no gym)', { hasInviteToken })
          }
          return NextResponse.redirect(onboardingUrl)
        }
        
        // If user has invite token, allow dashboard access for multi-gym invitation handling
        if (hasInviteToken) {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Allowing app route access with invite token')
          }
          return response
        }
        
        // Check if user is a member and redirect to portal (using cached data)
        if (userRoleData) {
          const roleName = (userRoleData.roles as unknown as { name: string })?.name
          if (roleName === 'member') {
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: Redirecting member from app route to portal')
            }
            const portalUrl = new URL('/portal', request.url)
            return NextResponse.redirect(portalUrl)
          }
        }

        // Check subscription access for protected app routes
        // Note: This is a basic check - detailed subscription logic is handled in components
        try {
          const { data: hasAccess, error: accessError } = await supabase.rpc('check_subscription_access', {
            p_user_id: user.id
          })

          if (accessError) {
            logger.warn('🔧 MIDDLEWARE: Error checking subscription access:', { error: accessError.message })
            // On error, allow access (fail open) instead of redirecting
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: Allowing access despite subscription check error (fail open)')
            }
            return response
          }

          // For routes that require subscription access, redirect to upgrade if no access
          if (!hasAccess && !pathname.startsWith('/upgrade') && !pathname.startsWith('/settings')) {
            if (process.env.NODE_ENV === 'development') {
              logger.info('🔧 MIDDLEWARE: No subscription access, redirecting to upgrade')
            }
            
            // Create redirect response
            const upgradeUrl = new URL('/upgrade', request.url)
            const redirectResponse = NextResponse.redirect(upgradeUrl)
            
            // Set cookie on the redirect response
            redirectResponse.cookies.set('subscription_status', 'no_access', {
              httpOnly: false,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 10 // 10 seconds
            })
            
            return redirectResponse
          }
        } catch (error) {
          // If subscription check fails, allow access (fail open)
          logger.warn('🔧 MIDDLEWARE: Subscription check failed, allowing access:', { error })
        }
        
        // Allow access to app routes for non-members
        return response
      }

    // Handle portal routes (member-specific)
    if (isPortalRoute) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 MIDDLEWARE: Processing portal route access')
      }
      
      // Check if user has member role in this gym (using cached data)
      if (!userProfileData?.gym_id) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: No gym_id found for user, redirecting to dashboard')
        }
        const dashboardUrl = new URL('/dashboard', request.url)
        
        // Set toast message in cookie
        response.cookies.set('toast_message', 'no_gym', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 5 // 5 seconds
        })
        
        return NextResponse.redirect(dashboardUrl)
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 MIDDLEWARE: Portal role check:', { 
          userRoleData, 
          gymId: userProfileData.gym_id,
          rawRoles: userRoleData?.roles,
          extractedRoleName: (userRoleData?.roles as unknown as { name: string })?.name
        })
      }
      
      // Only allow access if user has 'member' role
      if (userRoleData) {
        const roleName = (userRoleData.roles as unknown as { name: string })?.name
        if (roleName === 'member') {
          if (process.env.NODE_ENV === 'development') {
            logger.info('🔧 MIDDLEWARE: Allowing portal access - user is member')
          }
          return response
        }
      }
      
      // Redirect non-members to dashboard with toast message
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 MIDDLEWARE: Redirecting non-member from portal to dashboard')
      }
      const dashboardUrl = new URL('/dashboard', request.url)
      
      // Set toast message in cookie instead of URL params
      response.cookies.set('toast_message', 'portal_access_denied', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 // 5 seconds
      })
      
      return NextResponse.redirect(dashboardUrl)
    }

    // Allow access to future dedicated invite routes
    if (isInviteRoute) {
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 MIDDLEWARE: Allowing access to invite route for authenticated user')
      }
      return response
    }

      // For root path, redirect based on onboarding status
      if (pathname === '/') {
        const redirectPath = hasGym ? '/dashboard' : '/onboarding'
        const redirectUrl = new URL(redirectPath, request.url)
        if (hasInviteToken) {
          redirectUrl.searchParams.set('invite', inviteToken)
        }
        if (process.env.NODE_ENV === 'development') {
          logger.info('🔧 MIDDLEWARE: Redirecting root path to:', { redirectPath, hasInviteToken })
        }
        return NextResponse.redirect(redirectUrl)
      }
    }

    // Allow all other routes
    return response

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger.error('🔧 MIDDLEWARE: Error:', { error })
    }
    // On error, allow the request to continue (fail open)
    return NextResponse.next()
  }
}

// Using Node runtime to avoid HMR conflicts with lucide-react and other packages
// export const runtime = 'experimental-edge'

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - Static files (.png, .jpg, .css, .js, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|sw\\.js|manifest\\.json|browserconfig\\.xml|robots\\.txt).*)',
  ],
}