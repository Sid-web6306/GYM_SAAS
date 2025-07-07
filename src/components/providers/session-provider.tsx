'use client'

import { useInitializeAuth, useAuth } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Initialize auth system
  useInitializeAuth()
  
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