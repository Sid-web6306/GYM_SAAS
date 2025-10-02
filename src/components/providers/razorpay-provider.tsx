'use client'

import { ReactNode, Component } from 'react'
import { clientConfig } from '@/lib/config'
import { logger } from '@/lib/logger'

interface RazorpayProviderProps {
  children: ReactNode
}

// Simple error fallback component
function RazorpayErrorFallback() {
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
      <h3 className="text-red-800 font-medium">Payment System Error</h3>
      <p className="text-red-600 text-sm mt-1">
        There was an issue with the payment system. Please contact support.
      </p>
    </div>
  )
}

// Simple error boundary for Razorpay-related errors
class RazorpayErrorBoundary extends Component<
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
    logger.error('Razorpay Error Boundary caught an error:', {error, errorInfo})
  }

  render() {
    if (this.state.hasError) {
      return <RazorpayErrorFallback />
    }

    return this.props.children
  }
}

export function RazorpayProvider({ children }: RazorpayProviderProps) {
  // Check if Razorpay is configured
  const isConfigured = !!clientConfig.razorpayKeyId

  if (!isConfigured) {
    logger.warn('Razorpay is not configured. Payment features will be disabled.')
    return <>{children}</>
  }

  return (
    <RazorpayErrorBoundary>
      {children}
    </RazorpayErrorBoundary>
  )
}

// Helper component to get Razorpay configuration status
export function RazorpayConfigStatus() {
  const isConfigured = !!clientConfig.razorpayKeyId
  const keyId = clientConfig.razorpayKeyId
  
  return (
    <div className="text-sm text-muted-foreground space-y-1">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>Razorpay Status: {isConfigured ? 'Configured' : 'Not Configured'}</span>
      </div>
      {isConfigured && keyId && (
        <div className="font-mono text-xs text-muted-foreground">
          Key ID: {keyId.slice(0, 12)}...{keyId.slice(-4)}
        </div>
      )}
      {!isConfigured && (
        <div className="text-xs text-red-600">
          Set RAZORPAY_KEY_ID in your environment
        </div>
      )}
    </div>
  )
}