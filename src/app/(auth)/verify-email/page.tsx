'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { OTPVerification } from '@/components/auth/OTPVerification'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Building2 } from 'lucide-react'
import { toastActions } from '@/stores/toast-store'

const VerifyEmailContent = () => {
  const searchParams = useSearchParams()
  const { user, isLoading, isAuthenticated } = useAuth()
  
  // Get email from URL params first (for unauthenticated users), then from user
  const email = searchParams.get('email') || user?.email || ''

  // Don't show toast for already verified users - middleware will redirect them
  // The OTPVerification component handles success toasts when verification completes

  // Handle case where user is not authenticated but has email from URL
  // This happens during login flow with unverified email
  if (!isLoading && !isAuthenticated && email) {
    console.log('🔧 VERIFY EMAIL: Unauthenticated user with email from URL:', email)
  }

  // No need for custom callback - let component handle redirect

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If already verified, show loading while redirecting
  if (isAuthenticated && user?.email_confirmed_at) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Email already verified! Redirecting...</p>
        </div>
      </div>
    )
  }

  // If no email available, show error - middleware will handle redirect
  if (!email) {
    toastActions.error('Missing Email', 'No email address found. Please sign up again.')
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">No email found. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-xl font-bold text-gray-900">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            Complete your account setup by verifying your email address
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <OTPVerification
            email={email}
            redirectTo="/onboarding"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Main page component wrapped with Suspense for useSearchParams
const VerifyEmailPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

export default VerifyEmailPage
