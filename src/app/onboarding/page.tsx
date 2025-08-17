'use client'

import { Suspense, useEffect, useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Mail, Building2, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

import { toastActions } from '@/stores/toast-store'
import { completeOnboarding, type OnboardingFormState } from '@/actions/auth.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { RequireAuth } from '@/components/auth/AuthGuard'
import { authUIActions } from '@/stores/auth-store'
import { useTrialInitialization } from '@/hooks/use-trial'
import { useInviteVerification } from '@/hooks/use-invitations'
import { useSearchParams } from 'next/navigation'

// Enhanced submit button with improved loading states
const SubmitButton = ({ isValid }: { isValid: boolean }) => {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      size="lg"
      className="w-full transition-all duration-200 cursor-pointer disabled:cursor-not-allowed" 
      disabled={pending || !isValid}
    >
      {pending ? (
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Setting up your gym...</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5" />
          <span>Complete Setup</span>
        </div>
      )}
    </Button>
  )
}

// Redirect to email verification if email not confirmed
const EmailVerificationRedirect = ({ email }: { email: string }) => {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to OTP verification page
    toastActions.info('Email Verification Required', 'Please verify your email to continue.')
    router.replace(`/verify-email?email=${encodeURIComponent(email)}`)
  }, [email, router])

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Verification Required</h2>
          <p className="text-gray-600 mt-2">
            Redirecting you to verify your email address...
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    </div>
  )
}

// Gym setup form with validation
const GymSetupForm = ({ user, formAction }: {
  user: { email?: string },
  formAction: (formData: FormData) => void
}) => {
  const [gymName, setGymName] = useState('')
  const [gymNameError, setGymNameError] = useState('')
  const [touched, setTouched] = useState(false)

  // Real-time validation
  const validateGymName = (value: string) => {
    if (!value.trim()) {
      return 'Gym name is required'
    }
    if (value.trim().length < 2) {
      return 'Gym name must be at least 2 characters'
    }
    if (value.trim().length > 50) {
      return 'Gym name must be less than 50 characters'
    }
    return ''
  }

  // Handle gym name changes with validation
  const handleGymNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setGymName(value)
    
    if (touched) {
      setGymNameError(validateGymName(value))
    }
  }

  // Handle blur to show validation
  const handleGymNameBlur = () => {
    setTouched(true)
    setGymNameError(validateGymName(gymName))
  }

  const isValid = gymName.trim().length >= 2 && gymName.trim().length <= 50

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Building2 className="w-8 h-8 text-green-600" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to your Gym SaaS!</h2>
          <p className="text-gray-600 mt-2">
            Let&apos;s set up your gym profile to get started.
          </p>
        </div>
      </div>

      {/* User context card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Logged in as:</p>
            <p className="text-sm text-gray-600 truncate">{user?.email}</p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-500" />
        </div>
      </div>
      
      <form action={formAction} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="gymName" className="text-base font-medium">
            Gym Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="gymName"
            name="gym-name"
            type="text"
            placeholder="e.g., FitZone Gym, PowerHouse Fitness"
            value={gymName}
            onChange={handleGymNameChange}
            onBlur={handleGymNameBlur}
            className={`text-base transition-colors ${
              gymNameError && touched 
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                : isValid && touched 
                  ? 'border-green-300 focus:border-green-500 focus:ring-green-500'
                  : ''
            }`}
            required
          />
          
          {/* Validation feedback */}
          {touched && (
            <div className="flex items-center gap-2 mt-2">
              {gymNameError ? (
                <>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600">{gymNameError}</span>
                </>
              ) : isValid ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Looks good!</span>
                </>
              ) : null}
            </div>
          )}
          
          {/* Character counter */}
          <div className="text-right">
            <span className={`text-xs ${
              gymName.length > 45 ? 'text-orange-600' : 'text-gray-500'
            }`}>
              {gymName.length}/50 characters
            </span>
          </div>
        </div>

        <SubmitButton isValid={isValid} />
      </form>
      
      {/* Help text */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          You can always change your gym name later in settings.
        </p>
      </div>
    </div>
  )
}

// Inner content that uses useSearchParams must be wrapped in Suspense
const OnboardingContent = () => {
  const { user, hasGym, isLoading: authLoading, profile } = useAuth()
  const [profileLoadTimeout, setProfileLoadTimeout] = useState(false)
  // Handle invite acceptance directly (bypassing gym creation)
  const handleInviteAcceptance = async () => {
    if (!inviteToken || !isValidInvite) return
    
    try {
      console.log('Onboarding: Accepting invitation directly')
      await acceptInvitation()
      toastActions.success('Welcome to the team!', `You've successfully joined ${invitation?.gym.name}`)
      router.replace('/dashboard')
    } catch (error) {
      console.error('Failed to accept invitation:', error)
      toastActions.error('Invitation Error', 'Failed to accept invitation. Please try again.')
    }
  }

  const [state, formAction] = useActionState<OnboardingFormState | null, FormData>(completeOnboarding, null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { mutateAsync: initializeTrial, isIdle: trialNotStarted } = useTrialInitialization();

  // Get invite token from URL or user metadata
  const inviteToken = searchParams.get('invite') || user?.user_metadata?.pendingInviteToken || '';
  
  // Verify invitation if token exists
  const {
    invitation,
    isValid: isValidInvite,
    isLoading: isVerifyingInvite,
    error: inviteError,
    acceptInvitation
  } = useInviteVerification(inviteToken);

  // Add timeout for profile loading
  useEffect(() => {
    if (user && !profile && !profileLoadTimeout) {
      console.log('Onboarding: User found but no profile, setting timeout')
      const timer = setTimeout(() => {
        console.log('Onboarding: Profile load timeout reached')
        setProfileLoadTimeout(true)
      }, 5000) // 5 second timeout
      
      return () => clearTimeout(timer)
    }
  }, [user, profile, profileLoadTimeout])

  useEffect(() => {
    console.log('Onboarding: useEffect', { user: !!user, hasGym, authLoading, profile: !!profile })
  });

  // Multi-tab redirect: if user already has gym (completed onboarding in another tab), redirect to dashboard
  useEffect(() => {
    if (!authLoading && hasGym) {
      console.log('Onboarding: User already has gym profile, redirecting to dashboard (multi-tab sync)')
      toastActions.success('Welcome Back!', 'You have already completed onboarding.')
      router.replace('/dashboard')
      return
    }
  }, [hasGym, authLoading, router])

  // Handle server-side errors with toast notifications
  useEffect(() => {
    if (state?.error) {
      toastActions.error('Setup Failed', state.error.message)
    }
  }, [state])

  // Detect and mark new users, initialize trial for new users
  useEffect(() => {
    if (user && trialNotStarted) {
      // Check if this is a new user (account created recently)
      const userCreatedAt = new Date(user.created_at);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
      const isNewUser = timeDiffMinutes < 30; // Consider new if created within 30 minutes
      
      if (isNewUser) {
        console.log('Onboarding: Detected new user, marking as new')
        authUIActions.setIsNewUser(true)
        
        // Initialize trial subscription for new users
        console.log('Onboarding: Initializing trial subscription for new user')
        initializeTrial().catch((error) => {
          console.error('Onboarding: Failed to initialize trial:', error)
          // Don't block onboarding if trial initialization fails
        })
      }
    }
  }, [user, trialNotStarted, initializeTrial])

  // Show loading state while auth is loading or verifying invite
  // But allow proceeding if we have user and profile timeout is reached
  if ((authLoading || (inviteToken && isVerifyingInvite)) && !(user && profileLoadTimeout)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600">
            {inviteToken && isVerifyingInvite 
              ? 'Verifying your invitation...'
              : 'Loading your profile...'}
          </p>
        </div>
      </div>
    )
  }

  // Show loading state while redirecting if user already has gym
  if (hasGym) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  // If we have a valid invitation, show invitation acceptance interface (even for unauthenticated users)
  if (inviteToken && isValidInvite && invitation) {
    // If user is not authenticated, show invitation with login/signup options
    if (!user) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-center text-xl font-bold text-gray-900">
                Join {invitation.gym.name}
              </CardTitle>
              <CardDescription className="text-center text-gray-600">
                You&apos;ve been invited to join this gym as {invitation.role}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-6">
                {/* Invitation Details */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-900">{invitation.gym.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Role:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium capitalize">
                        {invitation.role}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      Invited by: <span className="font-medium">{invitation.invited_by.name}</span>
                    </div>
                    
                    {invitation.message && (
                      <div className="mt-3 p-3 bg-white border border-blue-200 rounded text-gray-700 italic text-sm">
                        &ldquo;{invitation.message}&rdquo;
                      </div>
                    )}
                  </div>
                </div>

                {/* Authentication Required Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Sign Up Required</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Please create an account to accept this invitation.
                  </p>
                </div>

                {/* Auth Action Buttons */}
                <div className="space-y-3">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/signup?invite=${inviteToken}`)}
                    className="w-full cursor-pointer"
                  >
                    Create Account & Accept Invitation
                  </Button>
                </div>

                {/* Alternative Action */}
                <div className="text-center pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-3">
                    Don&apos;t want to join this gym?
                  </p>
                  <Button 
                    variant="ghost" 
                    onClick={() => router.push('/')}
                    className="cursor-pointer text-gray-500"
                  >
                    Go to Homepage
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    // User is authenticated, check email confirmation
    const isEmailConfirmed = Boolean(user.email_confirmed_at)
    
    if (!isEmailConfirmed) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <EmailVerificationRedirect email={user.email || ''} />
            </CardContent>
          </Card>
        </div>
      )
    }

    // User is authenticated and email confirmed, show acceptance interface
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center text-xl font-bold text-gray-900">
              Join {invitation.gym.name}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              You&apos;re ready to join this gym as {invitation.role}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-6">
              {/* Invitation Details */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">{invitation.gym.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Role:</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium capitalize">
                      {invitation.role}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    Invited by: <span className="font-medium">{invitation.invited_by.name}</span>
                  </div>
                  
                  {invitation.message && (
                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded text-gray-700 italic text-sm">
                      &ldquo;{invitation.message}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Ready to join!</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Accept Button */}
              <Button 
                onClick={handleInviteAcceptance}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Accept Invitation & Join Team
              </Button>

              {/* Alternative Action */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3">
                  Want to create your own gym instead?
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/onboarding')}
                  className="cursor-pointer"
                >
                  Create My Own Gym
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state if no user and no invitation (unless timeout reached)
  if (!user && !profileLoadTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // If we timeout without a user, show error
  if (!user && profileLoadTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Authentication Error</h2>
                <p className="text-gray-600 mt-2">
                  Unable to load your profile. Please refresh the page or try logging in again.
                </p>
              </div>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }



  // Show error if invite token is invalid
  if (inviteToken && !isVerifyingInvite && (!isValidInvite || inviteError)) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Invalid Invitation</h2>
                  <p className="text-gray-600 mt-2">
                    {inviteError || 'This invitation link is invalid or has expired.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => router.push('/onboarding')} className="w-full cursor-pointer">
                    Continue with Gym Setup
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full cursor-pointer">
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    )
  }

  // Check if email is confirmed for authenticated users  
  const isEmailConfirmed = Boolean(user?.email_confirmed_at)
  const userEmail = user?.email || ''

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-center text-xl font-bold text-gray-900">
              {isEmailConfirmed ? 'Complete Setup' : 'Email Verification'}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {isEmailConfirmed 
                ? 'Just one more step to get your gym management started'
                : 'We need to verify your email address first'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-0">
            {isEmailConfirmed && user ? (
              <GymSetupForm 
                user={user} 
                formAction={formAction}
              />
            ) : (
              <EmailVerificationRedirect email={userEmail} />
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAuth>
  )
}

// Main onboarding page component wrapped with Suspense for useSearchParams
const OnboardingPage = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" /></div>}>
      <OnboardingContent />
    </Suspense>
  )
}

export default OnboardingPage
