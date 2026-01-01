'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { logger } from '@/lib/logger'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useAuth } from '@/hooks/use-auth'

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    // Set up a SINGLE global auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      logger.info('🔑 Auth event in SessionProvider:', { event })

      // Only invalidate on actual sign in/out events
      // Avoid invalidating on INITIAL_SESSION or TOKEN_REFRESHED to prevent redundant calls
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        const delay = event === 'SIGNED_IN' ? 100 : 0
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['auth-session'] })
        }, delay)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return (
    <>
      {children}
    </>
  )
}

// Loading wrapper for auth-dependent pages
export function AuthLoadingWrapper({
  children,
  fallback = <LoadingSpinner />
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return <>{fallback}</>
  }

  return <>{children}</>
} 