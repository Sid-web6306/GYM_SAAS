// src/utils/supabase/client.ts
import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import { type Database } from '@/types/supabase'
import { logger } from '@/lib/logger'

// Get environment-specific cookie prefix to prevent cross-environment conflicts
export const getEnvironmentPrefix = () => {
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

export function createClient() {
  const envPrefix = getEnvironmentPrefix()
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Only access document in browser environment
          if (typeof document === 'undefined') {
            return undefined
          }
          
          try {
            // Use environment-specific cookie names
            const envName = `${envPrefix}-${name}`
            const cookieValue = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${envName}=`))
              ?.split('=')
              .slice(1)
              .join('=')
            
            if (!cookieValue) {
              return undefined
            }
            
            // Decode URL-encoded cookie value
            let decodedValue: string
            try {
              decodedValue = decodeURIComponent(cookieValue)
            } catch (decodeError) {
              // If URL decoding fails, try using the raw value
              // but log a warning
              logger.warn('Cookie URL decode failed, using raw value', {
                cookieName: envName,
                error: decodeError
              })
              decodedValue = cookieValue
            }
            
            // Validate that the decoded value can be safely used
            // Check for invalid UTF-8 sequences by attempting to encode
            try {
              // This will throw if the string contains invalid UTF-8
              new TextEncoder().encode(decodedValue)
            } catch (utf8Error) {
              // Cookie contains invalid UTF-8, clear it and return undefined
              logger.warn('Invalid UTF-8 in cookie, clearing corrupted cookie', {
                cookieName: envName,
                error: utf8Error
              })
              
              // Clear the corrupted cookie
              document.cookie = `${envName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
              
              return undefined
            }
            
            return decodedValue
          } catch (error) {
            // Catch any other errors in cookie retrieval
            logger.error('Error reading cookie', {
              cookieName: name,
              envPrefix,
              error
            })
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          // Only access document in browser environment
          if (typeof document === 'undefined') {
            return
          }
          
          // Use environment-specific cookie names
          const envName = `${envPrefix}-${name}`
          let cookieString = `${envName}=${value}`

          if (options.path) {
            cookieString += `; path=${options.path}`
          }
          if (options.domain) {
            cookieString += `; domain=${options.domain}`
          }
          if (options.expires) {
            cookieString += `; expires=${options.expires.toUTCString()}`
          }
          if (options.maxAge) {
            cookieString += `; max-age=${options.maxAge}`
          }
          if (options.secure) {
            cookieString += `; secure`
          }
          if (options.sameSite) {
            cookieString += `; samesite=${options.sameSite}`
          }

          document.cookie = cookieString
          logger.info(`Cookie set: ${envName} (environment: ${envPrefix})`)
        },
        remove(name: string, options: CookieOptions) {
          // Only access document in browser environment
          if (typeof document === 'undefined') {
            return
          }
          
          // Use environment-specific cookie names
          const envName = `${envPrefix}-${name}`
          let cookieString = `${envName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`
          
          if (options?.path) {
            cookieString += `; path=${options.path}`
          }
          if (options?.domain) {
            cookieString += `; domain=${options.domain}`
          }
          
          document.cookie = cookieString
          logger.info(`Cookie removed: ${envName} (environment: ${envPrefix})`)
        }
      }
    }
  )
}