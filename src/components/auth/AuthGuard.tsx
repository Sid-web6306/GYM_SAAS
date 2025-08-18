'use client'

import { useAuthGuard } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireGym?: boolean
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireGym = false, 
  fallback = <LoadingSpinner />
}: AuthGuardProps) {
  const { canAccess, isLoading } = useAuthGuard({
    requireAuth,
    requireGym
  })
  
  if (isLoading) return <>{fallback}</>
  if (!canAccess) return null
  
  return <>{children}</>
}

// Convenience components
export function RequireAuth({ children, fallback }: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function RequireGym({ children, fallback }: { 
  children: React.ReactNode
  fallback?: React.ReactNode 
}) {
  return (
    <AuthGuard requireAuth={true} requireGym={true} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}
