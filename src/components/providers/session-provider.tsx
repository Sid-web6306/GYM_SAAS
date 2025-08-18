'use client'

import { LoadingSpinner } from '@/components/layout/LoadingSpinner'
import { useAuth } from '@/hooks/use-auth'

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Auth system is automatically initialized when useAuth is called in components
  
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