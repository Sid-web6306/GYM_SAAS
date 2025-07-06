'use client'

import { useAuthStore } from '@/stores/auth-store'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireOnboarding?: boolean
}

export const AuthGuard = ({ 
  children, 
  requireAuth = true, 
  requireOnboarding = false
}: AuthGuardProps) => {
  // const { isInitialized, isAuthenticated } = useAuthStore((state) => ({
  //   isInitialized: state.isInitialized,
  //   isAuthenticated: state.isAuthenticated()
  // }))
  const isInitialized = useAuthStore(state => state.isInitialized);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated());

  // Simplified AuthGuard - let SessionProvider handle most logic
  // Only do basic checks, don't block rendering during initialization
  
  // For onboarding pages, allow rendering even if not initialized
  // SessionProvider will handle the navigation logic
  if (requireOnboarding) {
    // Onboarding pages can render while initializing
    // SessionProvider will redirect if needed
    return <>{children}</>
  }

  // For other protected pages, only show if initialized
  if (!isInitialized) {
    return null // Let SessionProvider handle the loading state
  }

  // Additional component-level validations
  if (requireAuth && !isAuthenticated) {
    return null // SessionProvider will handle redirect
  }

  return <>{children}</>
} 