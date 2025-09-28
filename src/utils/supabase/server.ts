// src/utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'  // ← For SSR with cookies
import { createClient as createSupabaseClient } from '@supabase/supabase-js'  // ← For service role (no cookies needed)
import { cookies } from 'next/headers'
import { type Database } from '@/types/supabase'
import { logger } from '@/lib/logger'

// Get environment-specific cookie prefix to prevent cross-environment conflicts
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

export const createClient = async () => {
  const cookieStore = await cookies()
  const envPrefix = getEnvironmentPrefix()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Use environment-specific cookie names
          const envName = `${envPrefix}-${name}`
          return cookieStore.get(envName)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            cookieStore.set({ name: envName, value, ...options })
            console.log(`Server cookie set: ${envName} (environment: ${envPrefix})`)
          } catch (error) { 
            // Ignore errors on Server Components
            logger.warn('Server cookie set error:', {error})
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            cookieStore.set({ name: envName, value: '', ...options })
            console.log(`Server cookie removed: ${envName} (environment: ${envPrefix})`)
          } catch (error) { 
            // Ignore errors on Server Components
            logger.warn('Server cookie remove error:', {error})
          }
        },
      },
    }
  )
}

// Enhanced server-side auth check with better error handling
export const getServerAuth = async () => {
  try {
    const supabase = await createClient()
    
    // Get both user and session for more reliable auth check
    const [{ data: { user }, error: userError }, { data: { session }, error: sessionError }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession()
    ])
    
    // If there are errors, treat as unauthenticated
    if (userError || sessionError) {
      console.log('Server auth check failed:', { userError, sessionError })
      return { user: null, session: null, isAuthenticated: false }
    }
    
    // Both user and session must exist for valid authentication
    const isAuthenticated = !!(user && session)
    
    return { user, session, isAuthenticated }
  } catch (error) {
    console.error('Server auth check error:', error)
    return { user: null, session: null, isAuthenticated: false }
  }
}

// Create a service role client that bypasses RLS policies
export const createServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  }
  
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}