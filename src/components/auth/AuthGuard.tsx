'use client'

import { useAuthGuard } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireGym?: boolean
  redirectTo?: string
  fallback?: React.ReactNode
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireGym = false, 
  redirectTo = '/login',
  fallback = <LoadingSpinner />
}: AuthGuardProps) {
  const { canAccess, isLoading } = useAuthGuard({
    requireAuth,
    requireGym,
    redirectTo
  })
  
  if (isLoading) {
    return <>{fallback}</>
  }
  
  if (!canAccess) {
    return null // Redirect is handled by the hook
  }
  
  return <>{children}</>
}

// Convenience components for common patterns
export function RequireAuth({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function RequireGym({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} requireGym={true} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

export function GuestOnly({ children, redirectTo = '/dashboard' }: { children: React.ReactNode; redirectTo?: string }) {
  return (
    <AuthGuard requireAuth={false} redirectTo={redirectTo}>
      {children}
    </AuthGuard>
  )
} 