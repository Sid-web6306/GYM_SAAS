'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const EmailSchema = z.object({
  email: z.string().email()
})

export type AuthResult = {
  success?: boolean
  error?: string
}

// Signup with email (passwordless)
export async function signupWithEmail(formData: FormData): Promise<AuthResult> {
  let shouldRedirectToLogin = false
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
      options: { shouldCreateUser: true }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        shouldRedirectToLogin = true
      } else {
        return { error: error.message }
      }
    } else {
      shouldRedirectToVerify = true
      verifyEmail = validation.data.email
    }
  } catch (error) {
    console.error('Signup error:', error)
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirects outside try-catch
  if (shouldRedirectToLogin) {
    redirect('/login?message=user-exists')
  }
  if (shouldRedirectToVerify) {
    redirect(`/verify-email?email=${encodeURIComponent(verifyEmail)}`)
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
      if (error.message.includes('User not found')) {
        return { error: 'No account found with this email address' }
      }
      return { error: error.message }
    }

    shouldRedirectToVerify = true
    verifyEmail = validation.data.email
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirect outside try-catch
  if (shouldRedirectToVerify) {
    redirect(`/verify-email?email=${encodeURIComponent(verifyEmail)}`)
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
      console.error('Onboarding error:', error)
      return { error: 'Failed to create gym. Please try again.' }
    }

    // Initialize trial subscription after successful gym creation
    const { error: trialError } = await supabase.rpc('initialize_trial_subscription', {
      p_user_id: user.id
    })

    if (trialError) {
      console.error('Trial initialization error:', trialError)
      // Don't fail the onboarding if trial init fails, just log it
      // The user can still use the system and start trial later
    }

    shouldRedirectToDashboard = true
  } catch (error) {
    console.error('Onboarding error:', error)
    return { error: 'An unexpected error occurred' }
  }

  // Handle redirect outside try-catch
  if (shouldRedirectToDashboard) {
    redirect('/dashboard?welcome=true')
  }

  return { error: 'An unexpected error occurred' }
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
    console.error('Social login: No origin header found')
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

  console.log(`Initiating ${provider} OAuth with options:`, authOptions)

  let redirectUrl = ''

  try {
    const { data, error } = await supabase.auth.signInWithOAuth(authOptions)

    if (error) { 
      console.error(`${provider} OAuth error:`, error)
      
      // Handle specific OAuth errors
      if (error.message.includes('access_denied')) {
        redirectUrl = '/login?message=social-auth-cancelled'
      } else if (error.message.includes('invalid_request')) {
        redirectUrl = '/login?message=social-auth-invalid'
      } else {
        redirectUrl = '/login?message=social-auth-error'
      }
    } else if (data.url) { 
      console.log(`Redirecting to ${provider} OAuth URL:`, data.url)
      redirectUrl = data.url
    } else { 
      console.error(`${provider} OAuth: No redirect URL received`)
      redirectUrl = '/login?message=social-auth-error'
    }
  } catch (error) {
    // Only log and handle actual unexpected errors
    console.error(`${provider} OAuth unexpected error:`, error)
    redirectUrl = '/login?message=social-auth-error'
  }

  // Handle all redirects outside try-catch
  if (redirectUrl) {
    redirect(redirectUrl)
  }
}

