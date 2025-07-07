'use client'

import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/layout/LoadingSpinner'

interface SuspenseProviderProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const SuspenseProvider = ({ children, fallback }: SuspenseProviderProps) => {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  )

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  )
}

// Higher-order component for pages that use useSearchParams
export const withSuspense = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <SuspenseProvider fallback={fallback}>
      <Component {...props} />
    </SuspenseProvider>
  )
  
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`
  
  return WrappedComponent
} 