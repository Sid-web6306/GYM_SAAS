import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Get environment-specific cookie prefix (SAME as server.ts)
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Debug: Log all middleware requests
  console.log('🔧 MIDDLEWARE: Processing request to:', pathname)
  
  // Skip middleware for static files, API routes, and auth callback
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth/callback') ||
    pathname.includes('.') // Static files (images, favicon, etc.)
  ) {
    console.log('🔧 MIDDLEWARE: Skipping static/API route:', pathname)
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
    console.log('🔧 MIDDLEWARE: Using environment prefix:', envPrefix)

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
            console.log('🔧 MIDDLEWARE: Getting cookie:', { originalName: name, envName, hasValue: !!value })
            return value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            console.log('🔧 MIDDLEWARE: Setting cookie:', { originalName: name, envName })
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
            console.log('🔧 MIDDLEWARE: Removing cookie:', { originalName: name, envName })
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

    console.log('🔧 MIDDLEWARE: Auth check result:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      error: error?.message,
      pathname 
    })

    // If there's an auth error, treat as unauthenticated (fail-safe)
    const isAuthenticated = !error && !!session?.user
    const user = session?.user

    if (error) {
      console.warn('🔧 MIDDLEWARE: Auth error, treating as unauthenticated:', error.message)
    }

    // Define route types
    const authRoutes = ['/login', '/signup', '/verify-email', '/confirm-email']
    const appRoutes = ['/dashboard', '/members', '/staff', '/attendance', '/settings', '/team', '/upgrade']
    const publicRoutes = ['/', '/contact', '/privacy-policy', '/terms-of-service', '/refund-policy']
    
    const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
    const isAppRoute = appRoutes.some(route => pathname.startsWith(route))
    const isOnboardingRoute = pathname.startsWith('/onboarding')
    const isPublicRoute = publicRoutes.includes(pathname)

    // Handle unauthenticated users
    if (!isAuthenticated) {
      // Allow access to auth routes and public pages
      if (isAuthRoute || isPublicRoute) {
        return response
      }
      
      // Redirect to login for protected routes
      const loginUrl = new URL('/login', request.url)
      console.log('🔧 MIDDLEWARE: Redirecting unauthenticated user to login')
      return NextResponse.redirect(loginUrl)
    }

    // Handle authenticated users
    if (isAuthenticated && user) {
      // Check if user has completed onboarding (has gym setup)
      let hasGym = false
      
      try {
        // Query database for gym_id (reliable approach)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('gym_id')
          .eq('id', user.id)
          .single()
        
        console.log('🔧 MIDDLEWARE: Profile fetch result:', {
          profile,
          profileError: profileError?.message,
          hasGymId: !!(profile?.gym_id),
          userId: user.id
        })
        
        hasGym = !!(profile?.gym_id)
      } catch (error) {
        // If profile fetch fails, treat as no gym (fail-safe)
        console.warn('🔧 MIDDLEWARE: Profile fetch failed, treating as no gym:', error)
        hasGym = false
      }

      // Redirect authenticated users away from auth routes
      if (isAuthRoute) {
        const redirectUrl = hasGym ? '/dashboard' : '/onboarding'
        console.log('🔧 MIDDLEWARE: Redirecting authenticated user from auth route to:', redirectUrl)
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }

      // Handle onboarding flow
      if (isOnboardingRoute) {
        console.log('🔧 MIDDLEWARE: Onboarding route check:', { hasGym, shouldRedirect: hasGym })
        // If user already has gym, redirect to dashboard
        if (hasGym) {
          console.log('🔧 MIDDLEWARE: Redirecting /onboarding → /dashboard')
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        // Allow access to onboarding
        console.log('🔧 MIDDLEWARE: Allowing access to onboarding')
        return response
      }

      // Handle app routes
      if (isAppRoute) {
        // If user doesn't have gym, redirect to onboarding
        if (!hasGym) {
          console.log('🔧 MIDDLEWARE: Redirecting to onboarding (no gym)')
          return NextResponse.redirect(new URL('/onboarding', request.url))
        }
        // Allow access to app routes
        return response
      }

      // For root path, redirect based on onboarding status
      if (pathname === '/') {
        const redirectUrl = hasGym ? '/dashboard' : '/onboarding'
        console.log('🔧 MIDDLEWARE: Redirecting root path to:', redirectUrl)
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
    }

    // Allow all other routes
    return response

  } catch (error) {
    console.error('🔧 MIDDLEWARE: Error:', error)
    // On error, allow the request to continue (fail open)
    return NextResponse.next()
  }
}

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