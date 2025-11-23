'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

/**
 * Global error handler for Supabase authentication errors
 * Handles unhandled promise rejections related to invalid UTF-8 sequences in cookies
 */
export function SupabaseErrorHandler() {
  useEffect(() => {
    // Handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      const errorMessage = error?.message || String(error || '')
      
      // Check if it's a Supabase UTF-8 error
      if (errorMessage.includes('Invalid UTF-8 sequence')) {
        logger.warn('Caught unhandled Supabase UTF-8 error, clearing corrupted cookies', {
          error: errorMessage,
          stack: error?.stack
        })
        
        // Prevent the error from being logged to console
        event.preventDefault()
        
        // Try to clear all Supabase cookies
        try {
          if (typeof document !== 'undefined') {
            const envPrefix = process.env.NODE_ENV === 'development' ? 'dev' : 'prod'
            const cookieNames = [
              `${envPrefix}-sb-access-token`,
              `${envPrefix}-sb-refresh-token`,
              `${envPrefix}-sb-provider-token`,
              `${envPrefix}-sb-provider-refresh-token`
            ]
            
            cookieNames.forEach(cookieName => {
              // Clear cookie for current path
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
              // Clear cookie for root path
              document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
            })
            
            logger.info('Cleared corrupted Supabase cookies')
          }
        } catch (clearError) {
          logger.warn('Failed to clear corrupted cookies in error handler', {
            error: clearError
          })
        }
      }
    }
    
    // Add event listener
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  // This component doesn't render anything
  return null
}

