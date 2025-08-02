'use client'

import React from 'react'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  errorId: string
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  context?: string
}

interface ErrorFallbackProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  resetError: () => void
  errorId: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return { 
      hasError: true, 
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error with context
    logger.error('Component error boundary triggered', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context || 'unknown',
      errorId: this.state.errorId,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'server'
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo
    })
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: ''
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          errorId={this.state.errorId}
        />
      )
    }

    return this.props.children
  }
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError, 
  errorId 
}) => {
  const isDev = process.env.NODE_ENV === 'development'

  const handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 text-red-500">
            <AlertTriangle className="h-full w-full" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            We apologize for the inconvenience. An unexpected error has occurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDev && error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Error Details (Development Only)
              </h4>
              <p className="text-xs text-red-700 font-mono">{error.message}</p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-600 cursor-pointer">
                    Stack Trace
                  </summary>
                  <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 text-center">
            Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={resetError} variant="outline" className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleReload} variant="outline" className="flex-1">
              Reload Page
            </Button>
          </div>
          
          <Button onClick={handleGoHome} className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// Specific error boundary for auth-related components
export const AuthErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    context="authentication"
    onError={(error, errorInfo) => {
      logger.auth.error('Authentication component error', {
        error: error.message,
        componentStack: errorInfo.componentStack
      })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Specific error boundary for real-time components
export const RealtimeErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    context="realtime"
    onError={(error, errorInfo) => {
      logger.realtime.error('Real-time component error', {
        error: error.message,
        componentStack: errorInfo.componentStack
      })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Specific error boundary for data fetching components
export const DataErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    context="data-fetching"
    onError={(error, errorInfo) => {
      logger.db.error('Data component error', {
        error: error.message,
        componentStack: errorInfo.componentStack
      })
    }}
  >
    {children}
  </ErrorBoundary>
)

// Hook for imperitive error handling
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context: string = 'unknown') => {
    logger.error('Imperative error handler', {
      error: error.message,
      stack: error.stack,
      context
    })
    
    // In development, re-throw to trigger error boundary
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
    
    // In production, handle gracefully
    return {
      message: 'An error occurred. Please try again.',
      errorId: `error_${Date.now()}`
    }
  }, [])

  return { handleError }
} 