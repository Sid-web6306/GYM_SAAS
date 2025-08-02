'use client'

import { ReactNode, Component } from 'react'
import { clientConfig } from '@/lib/config'

interface StripeProviderProps {
  children: ReactNode
}

// Simple error fallback component
function StripeErrorFallback() {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
      <h3 className="text-red-800 font-medium">Payment System Error</h3>
      <p className="text-red-600 text-sm mt-1">
        There was an issue with the payment system. Please contact support.
      </p>
    </div>
  )
}

// Simple error boundary for Stripe-related errors
class StripeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Stripe Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <StripeErrorFallback />
    }

    return this.props.children
  }
}

export function StripeProvider({ children }: StripeProviderProps) {
  // Check if Stripe is configured
  const isConfigured = !!clientConfig.stripePublishableKey

  if (!isConfigured) {
    console.warn('Stripe is not configured. Payment features will be disabled.')
    return <>{children}</>
  }

  return (
    <StripeErrorBoundary>
      {children}
    </StripeErrorBoundary>
  )
}

// Helper component to get Stripe configuration status
export function StripeConfigStatus() {
  const isConfigured = !!clientConfig.stripePublishableKey
  const publishableKey = clientConfig.stripePublishableKey
  
  return (
    <div className="text-sm text-muted-foreground space-y-1">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>Stripe Status: {isConfigured ? 'Configured' : 'Not Configured'}</span>
      </div>
      {isConfigured && (
        <div className="font-mono text-xs text-muted-foreground">
          Key: {publishableKey.slice(0, 12)}...{publishableKey.slice(-4)}
        </div>
      )}
      {!isConfigured && (
        <div className="text-xs text-red-600">
          Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment
        </div>
      )}
    </div>
  )
} 