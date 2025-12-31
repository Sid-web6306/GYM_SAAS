'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { 
  getLoginErrorMessage, 
  getSignupErrorMessage,
  shouldRedirectToLogin
} from '@/lib/auth-messages'

const EmailSchema = z.object({
  email: z.string().email()
})


export type AuthResult = {
  success?: boolean
  error?: string
  message?: string
}

// Signup with email (passwordless)
export async function signupWithEmail(formData: FormData): Promise<AuthResult> {
  let needsLoginRedirect = false
  let needsVerifyRedirect = false
  let verifyEmail = ''
  let inviteToken = ''

  try {
    const email = formData.get('email') as string
    inviteToken = (formData.get('inviteToken') as string) || ''
    const validation = EmailSchema.safeParse({ email })
    
    if (!validation.success) {
      return { error: 'Please enter a valid email address' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: { shouldCreateUser: true }
    })

    if (error) {
      // Check if user already exists → redirect to login
      const userExists = shouldRedirectToLogin(error.message)
      if (userExists) {
        needsLoginRedirect = true
      } else {
        // Transform error to user-friendly message
        return { error: getSignupErrorMessage(error) }
      }
    } else {
      needsVerifyRedirect = true
      verifyEmail = validation.data.email
    }
  } catch (error) {
    logger.error('Signup error:', {error})
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirects outside try-catch - preserve invite token
  if (needsLoginRedirect) {
    const loginUrl = inviteToken 
      ? `/login?message=account-exists&invite=${encodeURIComponent(inviteToken)}`
      : '/login?message=account-exists'
    redirect(loginUrl)
  }
  if (needsVerifyRedirect) {
    const verifyUrl = inviteToken
      ? `/verify-email?email=${encodeURIComponent(verifyEmail)}&invite=${encodeURIComponent(inviteToken)}`
      : `/verify-email?email=${encodeURIComponent(verifyEmail)}`
    redirect(verifyUrl)
  }

  return { error: 'An unexpected error occurred' }
}

// Login with email (passwordless)
export async function loginWithEmail(formData: FormData): Promise<AuthResult> {
  let shouldRedirectToVerify = false
  let verifyEmail = ''

  try {
    const email = formData.get('email') as string
    const validation = EmailSchema.safeParse({ email })
    
    if (!validation.success) {
      return { error: 'Please enter a valid email address' }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: validation.data.email,
      options: { shouldCreateUser: false }
    })

    if (error) {
      // Transform error to user-friendly message
      return { error: getLoginErrorMessage(error) }
    }

    shouldRedirectToVerify = true
    verifyEmail = validation.data.email
  } catch (error) {
    logger.error('Login error:', {error})
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirect outside try-catch
  if (shouldRedirectToVerify) {
    redirect(`/verify-email?email=${encodeURIComponent(verifyEmail)}&mode=login`)
  }

  return { error: 'An unexpected error occurred' }
}

// Complete onboarding
export async function completeOnboarding(
  prevState: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  let shouldRedirectToDashboard = false

  try {
    // Handle both old and new field names for backward compatibility
    const gymName = (formData.get('gymName') || formData.get('gym-name')) as string
    
    if (!gymName?.trim()) {
      return { error: 'Gym name is required' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { error: 'Authentication required' }
    }

    const { error } = await supabase.rpc('complete_user_profile', {
      p_user_id: user.id,
      gym_name: gymName.trim()
    })

    if (error) {
      logger.error('Onboarding error:', {error})
      return { error: 'Failed to create gym. Please try again.' }
    }

    // Initialize trial subscription after successful gym creation
    const { error: trialError } = await supabase.rpc('initialize_trial_subscription', {
      p_user_id: user.id
    })

    if (trialError) {
      logger.error('Trial initialization error:', {trialError})
      // Don't fail the onboarding if trial init fails, just log it
      // The user can still use the system and start trial later
    }

    shouldRedirectToDashboard = true
  } catch (error) {
    logger.error('Onboarding error:', {error})
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirect outside try-catch
  if (shouldRedirectToDashboard) {
    redirect('/dashboard?welcome=true')
  }

  return { error: 'An unexpected error occurred' }
}

// Update user email with verification
export async function updateUserEmail(formData: FormData): Promise<AuthResult> {
  try {
    const newEmail = formData.get('newEmail') as string
    const validation = EmailSchema.safeParse({ email: newEmail })
    
    if (!validation.success) {
      return { error: 'Please enter a valid email address' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'Authentication required' }
    }

    // Check if it's the same email
    if (user.email === newEmail) {
      return { error: 'This is already your current email address' }
    }

    // Use updateUser method to initiate email change
    // This will send verification emails to both current and new email addresses
    const { error } = await supabase.auth.updateUser({
      email: newEmail
    })

    if (error) {
      logger.error('Email update error:', { error })
      
      // Handle specific error codes
      if (error.code === 'email_exists') {
        return { error: 'This email address is already registered to another account.' }
      }
      if (error.message?.includes('rate limit') || error.code === 'over_request_rate_limit') {
        return { error: 'Please wait a moment before trying again.' }
      }
      
      return { error: 'Failed to initiate email change. Please try again.' }
    }

    return {
      success: true,
      message: 'Verification code sent to your new email address'
    }
  } catch (error) {
    logger.error('Email update error:', { error })
    return { error: 'An unexpected error occurred' }
  }
}

// Resend email verification code
export async function resendEmailVerification(formData: FormData): Promise<AuthResult> {
  try {
    const newEmail = formData.get('newEmail') as string
    
    if (!newEmail) {
      return { error: 'Email is required' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'Authentication required' }
    }

    // Check if it's the same email
    if (user.email === newEmail) {
      return { error: 'This is already your current email address' }
    }

    // Use the proper resend API method for email_change
    // IMPORTANT: For email_change, the email parameter should be the CURRENT user's email
    // to identify the user, not the new email. Supabase will resend to the new email automatically.
    const { error } = await supabase.auth.resend({
      type: 'email_change',
      email: user.email!
    })

    if (error) {
      logger.error('Resend email verification error:', { error })
      
      // Handle rate limiting specifically
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return { error: 'Please wait a moment before requesting another verification code.' }
      }
      
      // Handle case where there's no pending email change
      if (error.message.includes('no email change') || error.message.includes('not found')) {
        return { error: 'No pending email change found. Please start the process again.' }
      }
      
      return { error: 'Failed to resend verification code. Please try again.' }
    }

    return { 
      success: true, 
      message: 'Verification code resent successfully' 
    }
  } catch (error) {
    logger.error('Resend email verification error:', { error })
    return { error: 'An unexpected error occurred' }
  }
}

// Verify email update with OTP
export async function verifyEmailUpdate(formData: FormData): Promise<AuthResult> {
  try {
    const newEmail = formData.get('newEmail') as string
    const token = formData.get('token') as string
    
    if (!newEmail || !token) {
      return { error: 'Email and verification code are required' }
    }

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { error: 'Authentication required' }
    }

    // Verify the OTP for email change
    // The type should be 'email_change' for email updates
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: newEmail,
      token,
      type: 'email_change'
    })

    if (verifyError || !verifyData.user) {
      return { error: 'Invalid verification code' }
    }

    // After successful email verification, the user's session might be updated
    // We need to ensure the session is properly refreshed
    if (verifyData.session) {
      // Set the new session if one is returned
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: verifyData.session.access_token,
        refresh_token: verifyData.session.refresh_token
      })
      
      if (sessionError) {
        logger.warn('Session update after email verification failed:', { error: sessionError })
        // Don't fail the email update for session issues
      }
    }

    // The email is automatically updated by Supabase when verifyOtp succeeds
    // The database trigger will automatically sync the email to profiles table

    return { 
      success: true, 
      message: 'Email address updated successfully' 
    }
  } catch (error) {
    logger.error('Email verification error:', { error })
    return { error: 'An unexpected error occurred' }
  }
}

// Social login server action
export async function loginWithSocialProvider(
  provider: 'google' | 'facebook',
  options?: {
    redirectTo?: string
    inviteToken?: string
  }
) {
  const supabase = await createClient()
  
  // Get origin from headers for proper redirect URL construction
  const { headers } = await import('next/headers')
  const headersList = await headers()
  const origin = headersList.get('origin')

  if (!origin) { 
    logger.error('Social login: No origin header found')
    redirect('/login?message=social-auth-error')
  }

  // Construct callback URL with invite token if present
  let callbackUrl = `${origin}/auth/callback`
  if (options?.inviteToken) {
    callbackUrl += `?invite=${options.inviteToken}`
  }

  // OAuth configuration with proper scopes per Supabase documentation
  const authOptions = {
    provider,
    options: { 
      redirectTo: options?.redirectTo || callbackUrl,
      // Request additional permissions for better profile data
      scopes: provider === 'google' 
        ? 'email profile openid' 
        : 'email public_profile',
      // Ensure we get fresh consent for profile data
      queryParams: {
        ...(provider === 'google' && {
          access_type: 'offline',
          prompt: 'consent',
        }),
        ...(provider === 'facebook' && {
          auth_type: 'rerequest',
        }),
      } as Record<string, string>,
    },
  }

  let redirectUrl = ''

  try {
    const { data, error } = await supabase.auth.signInWithOAuth(authOptions)

    if (error) { 
      logger.error(`${provider} OAuth error:`, {error})
      
      // Handle specific OAuth errors
      if (error.message.includes('access_denied')) {
        redirectUrl = '/login?message=social-auth-cancelled'
      } else if (error.message.includes('invalid_request')) {
        redirectUrl = '/login?message=social-auth-invalid'
      } else {
        redirectUrl = '/login?message=social-auth-error'
      }
    } else if (data.url) { 
      redirectUrl = data.url
    } else { 
      logger.error(`${provider} OAuth: No redirect URL received`)
      redirectUrl = '/login?message=social-auth-error'
    }
  } catch (error) {
    // Only log and handle actual unexpected errors
    logger.error(`${provider} OAuth unexpected error:`, {error})
    redirectUrl = '/login?message=social-auth-error'
  }

  // Handle all redirects outside try-catch
  if (redirectUrl) {
    redirect(redirectUrl)
  }
}
