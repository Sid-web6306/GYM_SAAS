'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

import { toastActions } from '@/stores/toast-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { logger } from '@/lib/logger'
import { RequireAuth } from '@/components/auth/AuthGuard'
import { useInviteVerification } from '@/hooks/use-invitations'
import { InviteVerificationErrorBoundary } from '@/components/invites/InvitationErrorBoundary'
import { Stepper, Step } from '@/components/ui/stepper'
import { PersonalDetailsStep } from '@/components/onboarding/PersonalDetailsStep'
import { GymNameStep } from '@/components/onboarding/GymNameStep'
import { createClient } from '@/utils/supabase/client'

type OnboardingStep = 1 | 2

// Steps configuration
const STEPS: Step[] = [
  { id: 'personal', title: 'Your Details', description: 'Tell us about you' },
  { id: 'gym-name', title: 'Gym Setup', description: 'Name your gym' },
]

// Inner content that uses useSearchParams must be wrapped in Suspense
const OnboardingContent = () => {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Onboarding state
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [fullName, setFullName] = useState('')
  const [gymName, setGymName] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false)

  // Load existing profile data
  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) return
      
      try {
        const supabase = createClient()
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        
        if (error) {
          logger.error('Error loading profile:', { error })
        } else if (profile?.full_name) {
          setFullName(profile.full_name)
          logger.info('Loaded existing full name:', { fullName: profile.full_name })
        }
      } catch (error) {
        logger.error('Error loading profile data:', { error })
      } finally {
        setIsLoadingProfile(false)
      }
    }

    loadProfileData()
  }, [user])

  // No need to determine contact collection - users always sign up with email

  // Get invite token from URL or user metadata
  const inviteToken = searchParams.get('invite') || user?.user_metadata?.pendingInviteToken || ''
  
  // Verify invitation if token exists
  const {
    invitation,
    isValid: isValidInvite,
    isLoading: isVerifyingInvite,
    error: inviteError,
    acceptInvitation
  } = useInviteVerification(inviteToken)

  // Handle invite acceptance
  const handleInviteAcceptance = async () => {
    if (!inviteToken || !isValidInvite) return
    
    try {
      logger.info('Accepting invitation')
      await acceptInvitation()
      toastActions.success('Welcome!', `You've successfully joined ${invitation?.gym.name}`)
      router.replace('/dashboard')
    } catch (error) {
      logger.error('Failed to accept invitation:', {error})
      toastActions.error('Error', 'Failed to accept invitation')
    }
  }

  // Navigation functions
  const goToStep = (step: OnboardingStep) => {
    setCurrentStep(step)
  }

  // Step 1: Personal details collected
  const handlePersonalDetailsNext = async (name: string) => {
    setFullName(name)
    
    // Update profile with full name
    if (!user?.id) {
      logger.error('User ID not found')
      toastActions.error('Error', 'User not authenticated')
      return
    }
    
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', user.id)
      
      if (error) {
        logger.error('Error updating profile name:', { error })
        toastActions.error('Error', 'Failed to save your name')
        return
      }
      
      logger.info('Profile name updated:', { name })
    } catch (error) {
      logger.error('Error updating profile:', { error })
    }
    
    // Move to gym setup
    setCurrentStep(2)
  }

  // Step 2: Gym name collected - complete onboarding
  const handleGymNameNext = (name: string) => {
    if (isCompletingOnboarding) return // Prevent multiple submissions
    setGymName(name)
    completeOnboarding(name)
  }

  // Complete onboarding
  const completeOnboarding = async (gym: string) => {
    if (isCompletingOnboarding) return // Prevent multiple submissions
    
    setIsCompletingOnboarding(true)
    
    try {
      const supabase = createClient()
      const userId = user?.id

      if (!userId) {
        throw new Error('User not authenticated')
      }

      // First, call the complete_user_profile RPC to create gym
      const { error: profileError } = await supabase.rpc('complete_user_profile', {
        p_user_id: userId,
        gym_name: gym,
      })

      if (profileError) {
        logger.error('Onboarding error:', { profileError })
        toastActions.error('Error', 'Failed to complete setup. Please try again.')
        return
      }

      // No secondary contact needed - user already has email from signup

      // Initialize trial subscription
      const { error: trialError } = await supabase.rpc('initialize_trial_subscription', {
        p_user_id: userId
      })

      if (trialError) {
        logger.error('Trial initialization error:', { trialError })
        // Don't fail the onboarding
      }

      toastActions.success('Success!', 'Your gym has been set up successfully')
      
      // Add a small delay to prevent race conditions with auth state changes
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Use window.location.href instead of router.push to avoid client-side navigation issues
      window.location.href = '/dashboard?welcome=true'
    } catch (error) {
      logger.error('Onboarding error:', { error })
      toastActions.error('Error', 'An unexpected error occurred')
    } finally {
      setIsCompletingOnboarding(false)
    }
  }

  // Show loading state
  if (authLoading || isLoadingProfile || (inviteToken && isVerifyingInvite)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-600">
            {inviteToken && isVerifyingInvite 
              ? 'Verifying your invitation...'
              : isLoadingProfile
              ? 'Loading your profile...'
              : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Handle invitation flow (keeping existing logic)
  if (inviteToken && isValidInvite && invitation) {
    // Show invite acceptance UI (keeping existing implementation)
    return (
      <InviteVerificationErrorBoundary>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">
              {/* Existing invite UI */}
              <Button onClick={handleInviteAcceptance} className="w-full">
                Accept Invitation
              </Button>
            </CardContent>
          </Card>
        </div>
      </InviteVerificationErrorBoundary>
    )
  }

  // Handle invalid invite
  if (inviteToken && !isVerifyingInvite && (!isValidInvite || inviteError)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto w-16 h-16 text-red-600" />
              <h2 className="text-xl font-semibold">Invalid Invitation</h2>
              <p className="text-gray-600">{inviteError || 'This invitation link is invalid or has expired.'}</p>
              <Button onClick={() => router.push('/onboarding')}>
                Continue with Gym Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="mx-auto w-16 h-16 text-red-600" />
              <h2 className="text-2xl font-bold">Authentication Required</h2>
              <p className="text-gray-600">Please log in to continue</p>
              <Button onClick={() => router.push('/login')}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main onboarding flow - simplified to 2 steps only
  const visibleSteps = STEPS

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl space-y-8">
          {/* Progress Stepper */}
          <Stepper 
            steps={visibleSteps} 
            currentStep={currentStep} 
          />

          {/* Step Content */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6">
              {/* Step 1: Personal Details */}
              {currentStep === 1 && (
                <PersonalDetailsStep
                  onNext={handlePersonalDetailsNext}
                  onBack={currentStep > 1 ? () => goToStep(1) : undefined}
                  initialValue={fullName}
                  userEmail={user?.email}
                />
              )}

              {/* Step 2: Gym Setup */}
              {currentStep === 2 && (
                <GymNameStep 
                  onNext={handleGymNameNext}
                  onBack={() => goToStep(1)}
                  initialValue={gymName}
                  isLoading={isCompletingOnboarding}
                />
              )}


            </CardContent>
          </Card>
        </div>

      </div>
    </RequireAuth>
  )
}

// Main page component wrapped with Suspense
const OnboardingPage = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}

export default OnboardingPage

