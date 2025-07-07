'use client'

import { useEffect, useState } from 'react'
import { toastActions } from '@/stores/toast-store'
import { completeOnboarding, type OnboardingFormState } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { RequireAuth } from '@/components/auth/AuthGuard'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

// Loading button component
const SubmitButton = () => {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      className={`w-full transition-all duration-200 ${pending ? 'animate-pulse' : ''}`} 
      disabled={pending}
    >
      {pending ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          Setting up...
        </div>
      ) : (
        'Complete Setup'
      )}
    </Button>
  )
}

const OnboardingPage = () => {
  const [emailConfirmed, setEmailConfirmed] = useState<boolean>(true)
  const [currentEmail, setCurrentEmail] = useState('')
  
  // Use TanStack Query hooks for auth state
  const { user, profile, hasGym } = useAuth()

  // Use action state for server action
  const [state, formAction] = useActionState<OnboardingFormState | null, FormData>(completeOnboarding, null)

  // Handle action state changes for errors. Success is handled by the server redirect.
  useEffect(() => {
    if (state?.error) {
      toastActions.error('Error', state.error.message)
    }
  }, [state])

  // Simplified auth state handling
  useEffect(() => {
    if (user) {
      // Set current email for display
      const userEmail = user.email || ''
      setCurrentEmail(userEmail)
      
      // Check if email is confirmed
      if (!user.email_confirmed_at) {
        setEmailConfirmed(false)
      } else {
        setEmailConfirmed(true)
      }
    }
  }, [user])

  // Show email confirmation if needed
  if (!emailConfirmed) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Email sent to:</strong>
              </p>
              <p className="text-sm font-mono bg-white px-2 py-1 rounded border">
                {currentEmail}
              </p>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <p>Please check your email and click the confirmation link to continue.</p>
              <p>After confirming, you&apos;ll be automatically redirected to complete your profile.</p>
            </div>
            
            <div className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                I&apos;ve confirmed my email
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <RequireAuth>
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md relative">
          <CardHeader className="text-center">
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Welcome! Please tell us about your gym to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <p><strong>Debug:</strong></p>
                <p>User: {user ? 'Yes' : 'No'}</p>
                <p>Profile: {profile ? 'Yes' : 'No'}</p>
                <p>Has Gym: {hasGym ? 'Yes' : 'No'}</p>
                <p>Email Confirmed: {user?.email_confirmed_at ? 'Yes' : 'No'}</p>
                <p>User Email: {user?.email || 'None'}</p>
                <p>Current Email: {currentEmail || 'None'}</p>
                <p>User ID: {user?.id || 'None'}</p>
                <p>Profile ID: {profile?.id || 'None'}</p>
              </div>
            )}
            
            <form action={formAction} className="space-y-4 relative">
              {/* Show user email for context */}
              {currentEmail && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={currentEmail}
                    disabled
                    className="bg-gray-50 text-gray-500"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="gymName">Gym Name</Label>
                <Input
                  id="gymName"
                  name="gym-name"
                  type="text"
                  placeholder="Enter your gym name"
                  required
                />
              </div>

              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}

export default OnboardingPage
