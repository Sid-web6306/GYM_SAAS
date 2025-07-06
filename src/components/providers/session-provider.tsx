'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useRouter, usePathname } from 'next/navigation'

interface SessionProviderProps {
  children: React.ReactNode
}

export const SessionProvider = ({ children }: SessionProviderProps) => {
  const initialize = useAuthStore(state => state.initialize)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated())
  const isInitialized = useAuthStore(state => state.isInitialized)
  const router = useRouter()
  const pathname = usePathname()
  
  // Initialize the auth store
  useEffect(() => {
    initialize()
  }, [initialize])

  // Single-tab logout detection - redirect to login if user becomes unauthenticated on app pages
  useEffect(() => {
    // Only handle redirects for authenticated app pages
    const isAppPage = pathname.startsWith('/dashboard') || 
                     pathname.startsWith('/members') || 
                     pathname.startsWith('/schedule') ||
                     pathname.startsWith('/analytics') ||
                     pathname.startsWith('/settings')
    
    // If user is on an app page but no longer authenticated, redirect to login
    // Add a small delay to prevent interference with normal auth flow
    if (isInitialized && !isAuthenticated && isAppPage) {
      const redirectTimer = setTimeout(() => {
        // Double-check auth state before redirecting
        const currentAuthState = useAuthStore.getState().isAuthenticated();
        if (!currentAuthState) {
          console.log('SessionProvider: User logged out, redirecting to login')
          router.replace('/login')
        }
      }, 300); // Slightly longer delay to let normal auth flow complete
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isInitialized, isAuthenticated, pathname, router])

  return <>{children}</>
} 