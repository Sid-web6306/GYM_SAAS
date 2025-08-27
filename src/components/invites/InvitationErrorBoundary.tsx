'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class InvitationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state to show error UI
    return {
      hasError: true,
      error,
      errorId: `invite_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    const errorId = this.state.errorId || 'unknown'
    
    logger.error('Invitation Error Boundary caught error', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    })

    // Call optional error handler
    this.props.onError?.(error, errorInfo)

    // Update state with error info
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleReportError = () => {
    const { error, errorId } = this.state
    const emailSubject = encodeURIComponent(`Invitation Error Report - ${errorId}`)
    const emailBody = encodeURIComponent(`
Error ID: ${errorId}
Error Message: ${error?.message || 'Unknown error'}
Timestamp: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}

Please describe what you were trying to do when this error occurred:
[Your description here]
    `)
    
    window.open(`mailto:support@yourgym.com?subject=${emailSubject}&body=${emailBody}`)
  }

  getErrorType(): 'network' | 'permission' | 'validation' | 'unknown' {
    const error = this.state.error
    if (!error) return 'unknown'

    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network'
    }
    if (message.includes('unauthorized') || message.includes('permission') || message.includes('forbidden')) {
      return 'permission'
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation'
    }
    
    return 'unknown'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorType = this.getErrorType()
      const { error, errorId } = this.state

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-center text-xl font-bold text-gray-900">
                {errorType === 'network' && 'Connection Problem'}
                {errorType === 'permission' && 'Access Denied'}
                {errorType === 'validation' && 'Invalid Information'}
                {errorType === 'unknown' && 'Something Went Wrong'}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                {errorType === 'network' && 'Unable to connect to our servers. Please check your internet connection.'}
                {errorType === 'permission' && 'You don\'t have permission to perform this action.'}
                {errorType === 'validation' && 'The information provided is not valid.'}
                {errorType === 'unknown' && 'An unexpected error occurred while processing your invitation.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-6">
                {/* Error Details (Development) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900 mb-2">Error Details:</div>
                      <div className="text-gray-700 mb-1">ID: {errorId}</div>
                      <div className="text-gray-700 mb-1">Message: {error?.message}</div>
                      {error?.stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-gray-600">Stack Trace</summary>
                          <pre className="mt-2 p-2 bg-white border rounded text-xs overflow-auto max-h-32">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      onClick={this.handleGoHome}
                      className="cursor-pointer"
                    >
                      <Home className="w-4 h-4 mr-2" />
                      Go Home
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={this.handleReportError}
                      className="cursor-pointer"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Report Issue
                    </Button>
                  </div>
                </div>

                {/* Help Text */}
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    If this problem persists, please contact support with error ID:{' '}
                    <span className="font-mono bg-gray-100 px-1 rounded">{errorId}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different invitation contexts

export const InviteCreationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <InvitationErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Invite creation error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          context: 'invite_creation'
        })
      }}
    >
      {children}
    </InvitationErrorBoundary>
  )
}

export const InviteVerificationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <InvitationErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Invite verification error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          context: 'invite_verification'
        })
      }}
    >
      {children}
    </InvitationErrorBoundary>
  )
}

export const InviteListErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <InvitationErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Invite list error', {
          error: error.message,
          componentStack: errorInfo.componentStack,
          context: 'invite_list'
        })
      }}
    >
      {children}
    </InvitationErrorBoundary>
  )
}
