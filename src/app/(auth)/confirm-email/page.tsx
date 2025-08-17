'use client'

import { useRouter } from "next/navigation"
import { useAuth } from '@/hooks/use-auth'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toastActions } from '@/stores/toast-store'

/**
 * Legacy email confirmation page - redirects to new OTP verification flow
 * This page is kept for backward compatibility with old email links
 */
const ConfirmEmailPage = () => {
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user?.email_confirmed_at) {
        // Already verified, go to onboarding  
        router.replace('/onboarding')
      } else if (user?.email) {
        // Redirect to new OTP verification
        toastActions.info('Updated Process', 'We now use a faster verification method.')
        router.replace(`/verify-email?email=${encodeURIComponent(user.email)}`)
      } else {
        // No user, redirect to signup
        toastActions.error('Session Expired', 'Please sign up again.')
        router.replace('/signup')
      }
    }
  }, [isLoading, isAuthenticated, user, router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="text-center">
        <Loader2 className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Redirecting to verification...</p>
      </div>
    </div>
  )
}

export default ConfirmEmailPage